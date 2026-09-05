<script setup lang="ts">
import { ref } from "vue";
import { callFunction, ApiCallError } from "../../lib/api";

interface CreateGameResponse {
  game_id: string;
  gm_invite_token: string;
}

const name = ref("");
const gmDisplayName = ref("");
const roundIntervalMinutes = ref(60);
const missedDeadlineMode = ref<"forfeit_fatal" | "no_consequence" | "one_round_penalty">("no_consequence");
const round1StartMode = ref<"wait_for_all" | "gm_manual" | "scheduled">("gm_manual");
const setupSecret = ref("");

const pending = ref(false);
const errorMessage = ref<string | null>(null);
const created = ref<CreateGameResponse | null>(null);

async function createGame() {
  pending.value = true;
  errorMessage.value = null;
  created.value = null;
  try {
    const res = await callFunction<CreateGameResponse>(
      "create-game",
      {
        name: name.value,
        gm_display_name: gmDisplayName.value,
        round_interval_minutes: roundIntervalMinutes.value,
        missed_deadline_mode: missedDeadlineMode.value,
        round1_start_mode: round1StartMode.value,
      },
      { extraHeaders: { "x-setup-secret": setupSecret.value } },
    );
    created.value = res;
  } catch (err) {
    errorMessage.value = err instanceof ApiCallError ? err.message : "Something went wrong.";
  } finally {
    pending.value = false;
  }
}

async function copyToken() {
  if (created.value) await navigator.clipboard.writeText(created.value.gm_invite_token);
}
</script>

<template>
  <div>
    <h1>GM Setup</h1>
    <p>Create the game, then invite players using their own invite links (not built yet in this milestone).</p>
    <form
      class="setup-form"
      @submit.prevent="createGame"
    >
      <label>
        Game name
        <input
          v-model="name"
          type="text"
          required
        >
      </label>
      <label>
        Your display name
        <input
          v-model="gmDisplayName"
          type="text"
          required
        >
      </label>
      <label>
        Round interval (minutes)
        <input
          v-model.number="roundIntervalMinutes"
          type="number"
          min="1"
          required
        >
      </label>
      <label>
        Missed-deadline mode
        <select v-model="missedDeadlineMode">
          <option value="forfeit_fatal">Forfeit is fatal</option>
          <option value="no_consequence">No consequence</option>
          <option value="one_round_penalty">One-round penalty</option>
        </select>
      </label>
      <label>
        Round 1 start mode
        <select v-model="round1StartMode">
          <option value="wait_for_all">Wait until everyone accepts</option>
          <option value="gm_manual">GM starts manually</option>
          <option value="scheduled">Auto-start at a scheduled time</option>
        </select>
      </label>
      <label>
        Setup secret
        <input
          v-model="setupSecret"
          type="password"
          required
        >
      </label>
      <button
        type="submit"
        :disabled="pending"
      >
        {{ pending ? "Creating..." : "Create game" }}
      </button>
    </form>
    <p
      v-if="errorMessage"
      class="error"
    >
      {{ errorMessage }}
    </p>
    <div
      v-if="created"
      class="created-token"
    >
      <p>Game created. GM invite token (shown once):</p>
      <code>{{ created.gm_invite_token }}</code>
      <button
        type="button"
        @click="copyToken"
      >
        Copy
      </button>
    </div>
  </div>
</template>

<style scoped>
.setup-form {
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-2);
  max-width: 480px;
}

.setup-form input,
.setup-form select {
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

.created-token {
  margin-top: var(--nbr-space-3);
  border: 1px solid var(--nbr-border);
  padding: var(--nbr-space-3);
}
</style>
