<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
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
  tie_break_method: "none" | "random" | "no_elimination";
  new_phase: string;
}

interface ResolveRoundResponse {
  resolved_count: number;
  resolutions: Resolution[];
}

interface GmGameOverview {
  players: {
    id: string;
    display_name: string;
    status: string;
    role: string;
  }[];
  current_round: {
    round_number: number;
    voting_deadline_at: string;
    players: {
      id: string;
      display_name: string;
      voted: boolean;
    }[];
  } | null;
  game: {
    round_interval_minutes: number;
    missed_deadline_mode: string;
    round1_start_mode: string;
    round_resolution_mode: string;
    allow_vote_change: boolean;
    tie_break_mode: string;
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
    resolved_outcome: "win" | "lose" | "lose_all" | null;
    picked_at: string;
  }[];
  move_to_room: {
    enabled: boolean;
    players: { id: string; display_name: string; room_id: string }[];
    guess_history: {
      round_number: number;
      guesser_display_name: string;
      target_display_name: string;
      guessed_room_id: string;
      correct: boolean | null;
    }[];
  } | null;
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

const { t } = useI18n();
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
    overviewError.value = err instanceof ApiCallError ? err.message : t("common.somethingWentWrong");
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
    startMessage.value = t("roundHeader.round", { number: res.round_number }) + ". " + t("roundHeader.deadline", { deadline: res.voting_deadline_at });
    await game.refresh(session.token);
  } catch (err) {
    startMessage.value = err instanceof ApiCallError ? err.message : t("common.somethingWentWrong");
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
      resolveMessage.value = t("gmInPlay.controls.notReadyResolve");
    } else {
      const summaries = res.resolutions.map((r) => {
        const names = r.eliminated_player_ids
          .map((id) => overview.value?.players.find((p) => p.id === id)?.display_name ?? id)
          .join(", ");
        return t("gmInPlay.controls.resolutionSummary", {
          number: r.round_number,
          names: names || t("gmInPlay.votes.noOne"),
          tieBreak: r.tie_break_method,
          phase: r.new_phase,
        });
      });
      resolveMessage.value = summaries.join(" | ");
      await game.refresh(session.token);
      await loadOverview();
    }
  } catch (err) {
    resolveMessage.value = err instanceof ApiCallError ? err.message : t("common.somethingWentWrong");
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
        ? t("gmInPlay.controls.notReadyDoors")
        : t("gmInPlay.controls.doorsResolved");
    await game.refresh(session.token);
    await loadOverview();
  } catch (err) {
    resolveDoorsMessage.value = err instanceof ApiCallError ? err.message : t("common.somethingWentWrong");
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
  if (!window.confirm(t("gmInPlay.controls.finishConfirm"))) return;
  finishPending.value = true;
  finishMessage.value = null;
  try {
    await callFunction("finish-game", {}, { token: session.token });
    session.clearSession();
    router.push({ name: "home" });
  } catch (err) {
    finishMessage.value = err instanceof ApiCallError ? err.message : t("common.somethingWentWrong");
  } finally {
    finishPending.value = false;
  }
}

// --- Export session ---
// A client-side snapshot of exactly what this screen already shows -- no new
// endpoint needed, since `overview` + the game store already hold all of it.
function exportSession() {
  if (!overview.value) return;

  const snapshot = {
    exported_at: new Date().toISOString(),
    game_id: game.gameId,
    game_name: game.gameName,
    phase: game.phase,
    settings: overview.value.game,
    players: overview.value.players,
    current_round: overview.value.current_round,
    rounds: overview.value.rounds,
    door_picks: overview.value.door_picks,
    move_to_room: overview.value.move_to_room,
  };

  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${game.gameId ?? "battle-royale"}-session.json`;
  link.click();
  URL.revokeObjectURL(url);
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
      errorMessage.value = t("gmInPlay.actionLog.targetRequired");
      return;
    }
    payload = { power_key: grantPowerKey.value, target_player_id: grantTargetPlayerId.value };
  } else {
    try {
      payload = JSON.parse(payloadText.value || "{}");
    } catch {
      errorMessage.value = t("gmInPlay.actionLog.invalidJson");
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
    errorMessage.value = err instanceof ApiCallError ? err.message : t("common.somethingWentWrong");
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <div>
    <h1>{{ t("gmInPlay.title") }}</h1>
    <p class="game-identity">
      {{ game.gameName ?? t("gmInPlay.unnamedGame") }}
      <span class="game-id">({{ game.gameId ?? "–" }})</span>
    </p>
    <h2>{{ t("gmInPlay.settings.heading") }}</h2>
    <div
      v-if="overview"
      class="table-scroll"
    >
      <table class="settings-table">
        <tbody>
          <tr>
            <th>{{ t("gmInPlay.settings.roundInterval") }}</th>
            <td>{{ t("gmInPlay.settings.minutesSuffix", { minutes: overview.game.round_interval_minutes }) }}</td>
          </tr>
          <tr>
            <th>{{ t("gmInPlay.settings.missedDeadlineMode") }}</th>
            <td>{{ overview.game.missed_deadline_mode }}</td>
          </tr>
          <tr>
            <th>{{ t("gmInPlay.settings.round1StartMode") }}</th>
            <td>{{ overview.game.round1_start_mode }}</td>
          </tr>
          <tr>
            <th>{{ t("gmInPlay.settings.roundResolutionMode") }}</th>
            <td>{{ overview.game.round_resolution_mode }}</td>
          </tr>
          <tr>
            <th>{{ t("gmInPlay.settings.allowVoteChange") }}</th>
            <td>{{ overview.game.allow_vote_change ? t("gmInPlay.settings.yes") : t("gmInPlay.settings.no") }}</td>
          </tr>
          <tr>
            <th>{{ t("gmInPlay.settings.tieBreakMode") }}</th>
            <td>
              {{
                overview.game.tie_break_mode === "no_elimination"
                  ? t("gmInPlay.settings.tieBreakNoElimination")
                  : t("gmInPlay.settings.tieBreakRandom")
              }}
            </td>
          </tr>
          <tr>
            <th>{{ t("gmInPlay.settings.doubleVoteEnabled") }}</th>
            <td>{{ overview.game.double_vote_enabled ? t("gmInPlay.settings.enabled") : t("gmInPlay.settings.disabled") }}</td>
          </tr>
          <tr v-if="overview.game.double_vote_enabled">
            <th>{{ t("gmInPlay.settings.doubleVoteFloorRounds") }}</th>
            <td>
              {{
                overview.game.double_vote_floor_rounds === -1
                  ? t("gmInPlay.settings.onceEver")
                  : t("gmInPlay.settings.roundsSuffix", { count: overview.game.double_vote_floor_rounds })
              }}
            </td>
          </tr>
          <tr>
            <th>{{ t("gmInPlay.settings.survivalStreakThreshold") }}</th>
            <td>{{ overview.game.survival_streak_threshold }}</td>
          </tr>
          <tr>
            <th>{{ t("gmInPlay.settings.created") }}</th>
            <td>{{ overview.game.created_at }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p
      v-else-if="overviewError"
      class="error"
    >
      {{ t("gmInPlay.settings.loadError", { error: overviewError }) }}
    </p>
    <p v-else>
      {{ t("gmInPlay.settings.loading") }}
    </p>

    <template v-if="overview?.current_round">
      <h2>{{ t("gmInPlay.currentRound.heading", { number: overview.current_round.round_number }) }}</h2>
      <div class="table-scroll">
        <table class="votes-table">
          <thead>
            <tr>
              <th>{{ t("gmInPlay.currentRound.player") }}</th>
              <th>{{ t("gmInPlay.currentRound.voteCast") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="p in overview.current_round.players"
              :key="p.id"
            >
              <td>{{ p.display_name }}</td>
              <td>{{ p.voted ? t("gmInPlay.settings.yes") : t("gmInPlay.settings.no") }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <h2>{{ t("gmInPlay.votes.heading") }}</h2>
    <p class="field-hint">
      {{ t("gmInPlay.votes.hint") }}
    </p>
    <p v-if="overview && overview.rounds.length === 0">
      {{ t("gmInPlay.votes.none") }}
    </p>
    <section
      v-for="round in overview?.rounds ?? []"
      :key="round.round_number"
      class="round-votes-block"
    >
      <h3>{{ t("gmInPlay.votes.round", { number: round.round_number }) }}</h3>
      <p>
        {{ t("gmInPlay.votes.eliminated", { name: round.eliminated_player_display_name ?? t("gmInPlay.votes.noOne") }) }}
        <span v-if="round.tie_break_method === 'random'">{{ t("gmInPlay.votes.randomTieBreak") }}</span>
        <span v-else-if="round.tie_break_method === 'no_elimination'">{{ t("gmInPlay.votes.noEliminationTieBreak") }}</span>
      </p>
      <div class="table-scroll">
        <table class="votes-table">
          <thead>
            <tr>
              <th>{{ t("gmInPlay.votes.voter") }}</th>
              <th>{{ t("gmInPlay.votes.target") }}</th>
              <th>{{ t("gmInPlay.votes.votesReceived") }}</th>
              <th>{{ t("gmInPlay.votes.doubleVote") }}</th>
              <th>{{ t("gmInPlay.votes.reason") }}</th>
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
              <td>{{ vote.is_double_vote ? t("gmInPlay.settings.yes") : "" }}</td>
              <td>{{ vote.reason ?? "" }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <template v-if="overview && overview.door_picks.length > 0">
      <h2>{{ t("gmInPlay.threeDoors.heading") }}</h2>
      <div class="table-scroll">
        <table class="votes-table">
          <thead>
            <tr>
              <th>{{ t("gmInPlay.threeDoors.player") }}</th>
              <th>{{ t("gmInPlay.threeDoors.door") }}</th>
              <th>{{ t("gmInPlay.threeDoors.outcome") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="pick in overview.door_picks"
              :key="pick.player_display_name"
            >
              <td>{{ pick.player_display_name }}</td>
              <td>{{ pick.door_number }}</td>
              <td>{{ pick.resolved_outcome ?? t("gmInPlay.threeDoors.pending") }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template v-if="overview?.move_to_room?.enabled">
      <h2>{{ t("gmInPlay.moveToRoom.heading") }}</h2>
      <p class="field-hint">
        {{ t("gmInPlay.moveToRoom.positionsHint") }}
      </p>
      <div class="table-scroll">
        <table class="votes-table">
          <thead>
            <tr>
              <th>{{ t("gmInPlay.moveToRoom.player") }}</th>
              <th>{{ t("gmInPlay.moveToRoom.room") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="p in overview.move_to_room.players"
              :key="p.id"
            >
              <td>{{ p.display_name }}</td>
              <td>{{ t(`moveToRoom.rooms.${p.room_id}`) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>{{ t("gmInPlay.moveToRoom.guessHistoryHeading") }}</h3>
      <p v-if="overview.move_to_room.guess_history.length === 0">
        {{ t("gmInPlay.moveToRoom.noGuesses") }}
      </p>
      <div
        v-else
        class="table-scroll"
      >
        <table class="votes-table">
          <thead>
            <tr>
              <th>{{ t("gmInPlay.moveToRoom.roundNumber") }}</th>
              <th>{{ t("gmInPlay.moveToRoom.guesser") }}</th>
              <th>{{ t("gmInPlay.moveToRoom.target") }}</th>
              <th>{{ t("gmInPlay.moveToRoom.guessedRoom") }}</th>
              <th>{{ t("gmInPlay.moveToRoom.correct") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(guess, i) in overview.move_to_room.guess_history"
              :key="i"
              :class="{ 'eliminated-row': guess.correct === false }"
            >
              <td>{{ guess.round_number }}</td>
              <td>{{ guess.guesser_display_name }}</td>
              <td>{{ guess.target_display_name }}</td>
              <td>{{ t(`moveToRoom.rooms.${guess.guessed_room_id}`) }}</td>
              <td>
                {{
                  guess.correct === null
                    ? t("gmInPlay.moveToRoom.pending")
                    : guess.correct
                      ? t("gmInPlay.settings.yes")
                      : t("gmInPlay.settings.no")
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <p>{{ t("gmInPlay.gamePhase", { phase: game.phase ?? t("gmInPlay.unknownPhase") }) }}</p>

    <RoundHeader v-if="game.currentRound" />

    <section class="round-controls">
      <button
        v-if="showStartButton"
        type="button"
        :disabled="startPending"
        @click="startRound"
      >
        {{ startPending ? t("gmInPlay.controls.starting") : t("gmInPlay.controls.startRound1") }}
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
        {{ resolvePending ? t("gmInPlay.controls.resolving") : t("gmInPlay.controls.resolveNow") }}
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
        {{ resolveDoorsPending ? t("gmInPlay.controls.resolving") : t("gmInPlay.controls.resolveDoors") }}
      </button>
      <p v-if="resolveDoorsMessage">
        {{ resolveDoorsMessage }}
      </p>
    </section>

    <section class="round-controls">
      <button
        type="button"
        :disabled="!overview"
        @click="exportSession"
      >
        {{ t("gmInPlay.controls.exportSession") }}
      </button>
      <p class="field-hint">
        {{ t("gmInPlay.controls.exportSessionHint") }}
      </p>
    </section>

    <section class="round-controls">
      <button
        type="button"
        class="finish-button"
        :disabled="finishPending"
        @click="finishGame"
      >
        {{ finishPending ? t("gmInPlay.controls.finishing") : t("gmInPlay.controls.finishGame") }}
      </button>
      <p class="field-hint">
        {{ t("gmInPlay.controls.finishGameHint") }}
      </p>
      <p
        v-if="finishMessage"
        class="error"
      >
        {{ finishMessage }}
      </p>
    </section>

    <hr>

    <p>{{ t("gmInPlay.actionLog.description") }}</p>
    <form
      class="action-form"
      @submit.prevent="submit"
    >
      <label>
        {{ t("gmInPlay.actionLog.actionType") }}
        <select v-model="actionType">
          <option
            v-for="type in ACTION_TYPES"
            :key="type"
            :value="type"
          >{{ type }}</option>
        </select>
      </label>
      <label>
        {{ t("gmInPlay.actionLog.roundId") }}
        <input
          v-model="roundId"
          type="text"
          placeholder="uuid"
        >
      </label>

      <template v-if="actionType === 'grant_power'">
        <label>
          {{ t("gmInPlay.actionLog.power") }}
          <select v-model="grantPowerKey">
            <option
              v-for="key in POWER_KEYS"
              :key="key"
              :value="key"
            >{{ key }}</option>
          </select>
        </label>
        <label>
          {{ t("gmInPlay.actionLog.targetPlayer") }}
          <select v-model="grantTargetPlayerId">
            <option
              value=""
              disabled
            >{{ t("gmInPlay.actionLog.selectPlayer") }}</option>
            <option
              v-for="p in (overview?.players ?? []).filter((pl) => pl.status === 'alive' && pl.role === 'player')"
              :key="p.id"
              :value="p.id"
            >
              {{ p.display_name }}
            </option>
          </select>
        </label>
      </template>
      <label v-else>
        {{ t("gmInPlay.actionLog.payload") }}
        <textarea
          v-model="payloadText"
          rows="4"
        />
      </label>
      <button
        type="submit"
        :disabled="pending"
      >
        {{ pending ? t("gmInPlay.actionLog.logging") : t("gmInPlay.actionLog.logAction") }}
      </button>
    </form>
    <p
      v-if="errorMessage"
      class="error"
    >
      {{ errorMessage }}
    </p>
    <p v-if="lastActionId">
      {{ t("gmInPlay.actionLog.logged", { id: lastActionId }) }}
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
