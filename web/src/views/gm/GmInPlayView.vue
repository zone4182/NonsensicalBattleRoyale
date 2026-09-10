<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useSessionStore } from "../../stores/session";
import { useGameStore } from "../../stores/game";
import { callFunction, ApiCallError } from "../../lib/api";
import RoundHeader from "../../components/round/RoundHeader.vue";

interface GmActionResponse {
  gm_action_id: string;
}

interface StartRoundResponse {
  round_id: string;
  round_number: number;
  voting_deadline_at: string;
}

interface Resolution {
  round_id: string;
  round_number: number;
  eliminated_player_ids: string[];
  tie_break_method: "none" | "random";
  new_phase: string;
}

interface ResolveRoundResponse {
  resolved_count: number;
  resolutions: Resolution[];
}

interface GmGameOverview {
  game: {
    round_interval_minutes: number;
    missed_deadline_mode: string;
    round1_start_mode: string;
    round_resolution_mode: string;
    allow_vote_change: boolean;
    double_vote_enabled: boolean;
    double_vote_floor_rounds: number;
    survival_streak_threshold: number;
    created_at: string;
    finished_at: string | null;
  };
  rounds: {
    round_number: number;
    eliminated_player_display_name: string | null;
    tie_break_method: string | null;
    resolved_at: string;
    votes: {
      voter_display_name: string;
      target_display_name: string;
      target_vote_count: number;
      is_double_vote: boolean;
      reason: string | null;
      cast_at: string;
    }[];
  }[];
  door_picks: {
    player_display_name: string;
    door_number: number;
    resolved_outcome: "win" | "lose_all" | null;
    picked_at: string;
  }[];
}

const ACTION_TYPES = ["tie_break", "grant_power", "narration_edit", "twist"];
const POWER_KEYS = [
  "rewind",
  "whisper",
  "watcher",
  "ward",
  "deflect",
  "null",
  "second_voice",
  "compel",
  "silence",
  "swap",
  "false_flag",
];

const router = useRouter();
const session = useSessionStore();
const game = useGameStore();

// Settings summary + per-resolved-round vote attribution -- GM-only (gm-game-overview),
// deliberately separate from game.refresh()'s poll-friendly 15s cadence since full vote
// history is heavier and only needs to change right after a resolve, not continuously.
const overview = ref<GmGameOverview | null>(null);
const overviewError = ref<string | null>(null);

async function loadOverview() {
  if (!session.token) return;
  overviewError.value = null;
  try {
    overview.value = await callFunction<GmGameOverview>("gm-game-overview", {}, { token: session.token });
  } catch (err) {
    overviewError.value = err instanceof ApiCallError ? err.message : "Something went wrong.";
  }
}

onMounted(() => {
  if (session.token) game.refresh(session.token);
  loadOverview();
});

// --- Start Round 1 ---
const startPending = ref(false);
const startMessage = ref<string | null>(null);

async function startRound() {
  if (!session.token) return;
  startPending.value = true;
  startMessage.value = null;
  try {
    const res = await callFunction<StartRoundResponse>("start-round", {}, { token: session.token });
    startMessage.value = `Round ${res.round_number} started. Deadline: ${res.voting_deadline_at}`;
    await game.refresh(session.token);
  } catch (err) {
    startMessage.value = err instanceof ApiCallError ? err.message : "Something went wrong.";
  } finally {
    startPending.value = false;
  }
}

// --- Resolve now ---
const resolvePending = ref(false);
const resolveMessage = ref<string | null>(null);

async function resolveNow() {
  if (!session.token) return;
  resolvePending.value = true;
  resolveMessage.value = null;
  try {
    const res = await callFunction<ResolveRoundResponse>("resolve-round", {}, { token: session.token });
    if (res.resolved_count === 0) {
      resolveMessage.value =
        "Not ready yet -- the deadline hasn't passed and not every alive player has cast their full vote(s) yet.";
    } else {
      const summaries = res.resolutions.map((r) => {
        const names = r.eliminated_player_ids
          .map((id) => game.players.find((p) => p.id === id)?.displayName ?? id)
          .join(", ");
        return `Round ${r.round_number}: eliminated ${names || "no one"} (tie: ${r.tie_break_method}) -> phase ${r.new_phase}`;
      });
      resolveMessage.value = summaries.join(" | ");
      await game.refresh(session.token);
      await loadOverview();
    }
  } catch (err) {
    resolveMessage.value = err instanceof ApiCallError ? err.message : "Something went wrong.";
  } finally {
    resolvePending.value = false;
  }
}

// --- Resolve doors (Three Doors) ---
// resolve-round and resolve-doors are entirely separate endpoints (Three Doors has no
// `rounds` row at all) -- "Resolve now" calling resolve-round during three_doors was
// always a no-op (resolved_count: 0, read as "not ready yet"), not an actual attempt.
const resolveDoorsPending = ref(false);
const resolveDoorsMessage = ref<string | null>(null);

async function resolveDoors() {
  if (!session.token) return;
  resolveDoorsPending.value = true;
  resolveDoorsMessage.value = null;
  try {
    const res = await callFunction<{ resolved_count: number }>("resolve-doors", {}, { token: session.token });
    resolveDoorsMessage.value =
      res.resolved_count === 0
        ? "Not ready yet -- not every alive player has picked a door."
        : "Doors resolved -- game over.";
    await game.refresh(session.token);
    await loadOverview();
  } catch (err) {
    resolveDoorsMessage.value = err instanceof ApiCallError ? err.message : "Something went wrong.";
  } finally {
    resolveDoorsPending.value = false;
  }
}

const showStartButton = computed(() => game.phase === "setup" || game.phase === null);
const showResolveButton = computed(() => game.phase === "active");
const showResolveDoorsButton = computed(() => game.phase === "three_doors");

// --- Finish game ---
// Administrative closure, separate from phase 'ended' (see finish-game/index.ts) --
// available regardless of phase, since the GM might also be abandoning a game early.
// No revisiting a finished game yet (deliberately deferred), so this clears the
// session and sends the GM back to the landing page rather than leaving them logged
// into a game they just closed.
const finishPending = ref(false);
const finishMessage = ref<string | null>(null);

async function finishGame() {
  if (!session.token) return;
  if (!window.confirm("Finish this game? You won't be able to revisit it (not built yet) -- this just closes it out.")) return;
  finishPending.value = true;
  finishMessage.value = null;
  try {
    await callFunction("finish-game", {}, { token: session.token });
    session.clearSession();
    router.push({ name: "home" });
  } catch (err) {
    finishMessage.value = err instanceof ApiCallError ? err.message : "Something went wrong.";
  } finally {
    finishPending.value = false;
  }
}

// --- Existing GM action log form ---
const actionType = ref(ACTION_TYPES[0]);
const payloadText = ref("{}");
const roundId = ref("");
const pending = ref(false);
const errorMessage = ref<string | null>(null);
const lastActionId = ref<string | null>(null);

// grant_power gets a structured mini-form instead of raw JSON -- the server remains
// the source of truth for whether a power is enabled for this game.
const grantPowerKey = ref(POWER_KEYS[0]);
const grantTargetPlayerId = ref("");

async function submit() {
  if (!session.token) return;

  let payload: unknown;
  if (actionType.value === "grant_power") {
    if (!grantTargetPlayerId.value) {
      errorMessage.value = "Pick a target player.";
      return;
    }
    payload = { power_key: grantPowerKey.value, target_player_id: grantTargetPlayerId.value };
  } else {
    try {
      payload = JSON.parse(payloadText.value || "{}");
    } catch {
      errorMessage.value = "Payload must be valid JSON.";
      return;
    }
  }

  pending.value = true;
  errorMessage.value = null;
  try {
    const res = await callFunction<GmActionResponse>(
      "gm-action",
      { action_type: actionType.value, payload, round_id: roundId.value.trim() || null },
      { token: session.token },
    );
    lastActionId.value = res.gm_action_id;
  } catch (err) {
    errorMessage.value = err instanceof ApiCallError ? err.message : "Something went wrong.";
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <div>
    <h1>GM: In Play</h1>
    <p class="game-identity">
      {{ game.gameName ?? "Unnamed game" }}
      <span class="game-id">({{ game.gameId ?? "-" }})</span>
    </p>
    <h2>Settings</h2>
    <div
      v-if="overview"
      class="table-scroll"
    >
    <table class="settings-table">
      <tbody>
        <tr>
          <th>Round interval</th>
          <td>{{ overview.game.round_interval_minutes }} min</td>
        </tr>
        <tr>
          <th>Missed-deadline mode</th>
          <td>{{ overview.game.missed_deadline_mode }}</td>
        </tr>
        <tr>
          <th>Round 1 start mode</th>
          <td>{{ overview.game.round1_start_mode }}</td>
        </tr>
        <tr>
          <th>Round resolution mode</th>
          <td>{{ overview.game.round_resolution_mode }}</td>
        </tr>
        <tr>
          <th>Players can change their vote</th>
          <td>{{ overview.game.allow_vote_change ? "Yes" : "No" }}</td>
        </tr>
        <tr>
          <th>Random double vote</th>
          <td>{{ overview.game.double_vote_enabled ? "Enabled" : "Disabled" }}</td>
        </tr>
        <tr v-if="overview.game.double_vote_enabled">
          <th>Double-vote cooldown (rounds)</th>
          <td>{{ overview.game.double_vote_floor_rounds }}</td>
        </tr>
        <tr>
          <th>Survival streak threshold</th>
          <td>{{ overview.game.survival_streak_threshold }}</td>
        </tr>
        <tr>
          <th>Created</th>
          <td>{{ overview.game.created_at }}</td>
        </tr>
      </tbody>
    </table>
    </div>
    <p
      v-else-if="overviewError"
      class="error"
    >
      Couldn't load settings: {{ overviewError }}
    </p>
    <p v-else>
      Loading settings...
    </p>

    <h2>Resolved rounds -- full vote breakdown</h2>
    <p class="field-hint">
      GM-only. Players never see who voted for whom until the game ends -- this view is
      an exception made specifically for you, not a change to what players are shown.
    </p>
    <p v-if="overview && overview.rounds.length === 0">
      No rounds resolved yet.
    </p>
    <section
      v-for="round in overview?.rounds ?? []"
      :key="round.round_number"
      class="round-votes-block"
    >
      <h3>Round {{ round.round_number }}</h3>
      <p>
        Eliminated: {{ round.eliminated_player_display_name ?? "no one" }}
        <span v-if="round.tie_break_method === 'random'">(random tie-break)</span>
      </p>
      <div class="table-scroll">
      <table class="votes-table">
        <thead>
          <tr>
            <th>Voter</th>
            <th>Target</th>
            <th>Votes received</th>
            <th>Double vote</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(vote, i) in round.votes"
            :key="i"
            :class="{ 'eliminated-row': vote.target_display_name === round.eliminated_player_display_name }"
          >
            <td>{{ vote.voter_display_name }}</td>
            <td>{{ vote.target_display_name }}</td>
            <td>{{ vote.target_vote_count }}</td>
            <td>{{ vote.is_double_vote ? "Yes" : "" }}</td>
            <td>{{ vote.reason ?? "" }}</td>
          </tr>
        </tbody>
      </table>
      </div>
    </section>

    <template v-if="overview && overview.door_picks.length > 0">
      <h2>Three Doors</h2>
      <div class="table-scroll">
      <table class="votes-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Door</th>
            <th>Outcome</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="pick in overview.door_picks"
            :key="pick.player_display_name"
          >
            <td>{{ pick.player_display_name }}</td>
            <td>{{ pick.door_number }}</td>
            <td>{{ pick.resolved_outcome ?? "pending" }}</td>
          </tr>
        </tbody>
      </table>
      </div>
    </template>

    <p>Game phase: {{ game.phase ?? "unknown" }}</p>

    <RoundHeader v-if="game.currentRound" />

    <section class="round-controls">
      <button
        v-if="showStartButton"
        type="button"
        :disabled="startPending"
        @click="startRound"
      >
        {{ startPending ? "Starting..." : "Start Round 1" }}
      </button>
      <p v-if="startMessage">
        {{ startMessage }}
      </p>
    </section>

    <section class="round-controls">
      <button
        v-if="showResolveButton"
        type="button"
        :disabled="resolvePending"
        @click="resolveNow"
      >
        {{ resolvePending ? "Resolving..." : "Resolve now" }}
      </button>
      <p v-if="resolveMessage">
        {{ resolveMessage }}
      </p>
    </section>

    <section class="round-controls">
      <button
        v-if="showResolveDoorsButton"
        type="button"
        :disabled="resolveDoorsPending"
        @click="resolveDoors"
      >
        {{ resolveDoorsPending ? "Resolving..." : "Resolve doors" }}
      </button>
      <p v-if="resolveDoorsMessage">
        {{ resolveDoorsMessage }}
      </p>
    </section>

    <section class="round-controls">
      <button
        type="button"
        class="finish-button"
        :disabled="finishPending"
        @click="finishGame"
      >
        {{ finishPending ? "Finishing..." : "Finish game" }}
      </button>
      <p class="field-hint">
        Closes this game out and sends you back to the landing page. Revisiting a
        finished game isn't built yet -- planned for a later version.
      </p>
      <p
        v-if="finishMessage"
        class="error"
      >
        {{ finishMessage }}
      </p>
    </section>

    <hr>

    <p>Log a GM action (tie-break, power grant, narration edit, or twist). Every call is logged and auditable.</p>
    <form
      class="action-form"
      @submit.prevent="submit"
    >
      <label>
        Action type
        <select v-model="actionType">
          <option
            v-for="type in ACTION_TYPES"
            :key="type"
            :value="type"
          >{{ type }}</option>
        </select>
      </label>
      <label>
        Round id (optional)
        <input
          v-model="roundId"
          type="text"
          placeholder="uuid"
        >
      </label>

      <template v-if="actionType === 'grant_power'">
        <label>
          Power
          <select v-model="grantPowerKey">
            <option
              v-for="key in POWER_KEYS"
              :key="key"
              :value="key"
            >{{ key }}</option>
          </select>
        </label>
        <label>
          Target player
          <select v-model="grantTargetPlayerId">
            <option
              value=""
              disabled
            >Select a player</option>
            <option
              v-for="p in game.players.filter((pl) => pl.status === 'alive' && pl.role === 'player')"
              :key="p.id"
              :value="p.id"
            >
              {{ p.displayName }}
            </option>
          </select>
        </label>
      </template>
      <label v-else>
        Payload (JSON)
        <textarea
          v-model="payloadText"
          rows="4"
        />
      </label>
      <button
        type="submit"
        :disabled="pending"
      >
        {{ pending ? "Logging..." : "Log action" }}
      </button>
    </form>
    <p
      v-if="errorMessage"
      class="error"
    >
      {{ errorMessage }}
    </p>
    <p v-if="lastActionId">
      Logged as {{ lastActionId }}.
    </p>
  </div>
</template>

<style scoped>
.game-identity {
  color: var(--nbr-muted);
}

.game-id {
  font-size: 0.85em;
}

.table-scroll {
  overflow-x: auto;
  margin-bottom: var(--nbr-space-3);
}

.settings-table,
.votes-table {
  border-collapse: collapse;
}

.settings-table th,
.settings-table td,
.votes-table th,
.votes-table td {
  border: 1px solid var(--nbr-border);
  padding: var(--nbr-space-1) var(--nbr-space-2);
  text-align: left;
}

.settings-table th {
  color: var(--nbr-muted);
  font-weight: normal;
}

.votes-table th {
  color: var(--nbr-accent);
}

.eliminated-row {
  background: color-mix(in srgb, var(--nbr-danger) 20%, transparent);
}

.eliminated-row td {
  color: var(--nbr-danger);
}

.round-votes-block {
  margin-bottom: var(--nbr-space-4);
}

.field-hint {
  color: var(--nbr-muted);
  font-size: 0.85em;
}

.round-controls {
  margin-bottom: var(--nbr-space-3);
}

.finish-button {
  border-color: var(--nbr-danger);
  color: var(--nbr-danger);
}

.action-form {
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-2);
  max-width: 480px;
}

.action-form input,
.action-form select,
.action-form textarea {
  background: var(--nbr-bg-raised);
  color: var(--nbr-fg);
  border: 1px solid var(--nbr-border);
  padding: var(--nbr-space-2);
  font-family: inherit;
  width: 100%;
}

.error {
  color: var(--nbr-danger);
}
</style>
