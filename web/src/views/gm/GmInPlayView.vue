<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useSessionStore } from "../../stores/session";
import { useGameStore } from "../../stores/game";
import { callFunction, ApiCallError } from "../../lib/api";

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

const session = useSessionStore();
const game = useGameStore();

onMounted(() => {
  if (session.token) game.refresh(session.token);
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
      resolveMessage.value = "Not ready yet -- the current round's deadline hasn't passed.";
    } else {
      const summaries = res.resolutions.map((r) => {
        const names = r.eliminated_player_ids
          .map((id) => game.players.find((p) => p.id === id)?.displayName ?? id)
          .join(", ");
        return `Round ${r.round_number}: eliminated ${names || "no one"} (tie: ${r.tie_break_method}) -> phase ${r.new_phase}`;
      });
      resolveMessage.value = summaries.join(" | ");
      await game.refresh(session.token);
    }
  } catch (err) {
    resolveMessage.value = err instanceof ApiCallError ? err.message : "Something went wrong.";
  } finally {
    resolvePending.value = false;
  }
}

const showStartButton = computed(() => game.phase === "setup" || game.phase === null);
const showResolveButton = computed(() => game.phase === "active" || game.phase === "three_doors");

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
    <p>Game phase: {{ game.phase ?? "unknown" }}</p>

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
              v-for="p in game.players.filter((pl) => pl.status === 'alive')"
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
.round-controls {
  margin-bottom: var(--nbr-space-3);
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
