<script setup lang="ts">
import { computed, ref } from "vue";
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
const botMode = ref(false);
const botCount = ref(1);
const botCountOptions = Array.from({ length: 19 }, (_, i) => i + 1);
const roundResolutionMode = ref<"manual" | "automatic">("manual");
const allowVoteChange = ref(false);

const roundResolutionModeHints: Record<typeof roundResolutionMode.value, string> = {
  manual: "Rounds only resolve when you click \"Resolve now\" yourself, even after the deadline passes.",
  automatic: "Rounds resolve on their own the moment the deadline passes -- no need to have the app open.",
};
const roundResolutionModeHint = computed(() => roundResolutionModeHints[roundResolutionMode.value]);

const missedDeadlineModeHints: Record<typeof missedDeadlineMode.value, string> = {
  forfeit_fatal: "Missing the vote deadline eliminates that player, same as being voted out.",
  no_consequence: "Missing the deadline does nothing beyond that player not casting a vote this round.",
  one_round_penalty: "Missing the deadline excludes the player from voting and using powers next round only -- not eliminated.",
};
const missedDeadlineModeHint = computed(() => missedDeadlineModeHints[missedDeadlineMode.value]);

const round1StartModeHints: Record<typeof round1StartMode.value, string> = {
  wait_for_all: "Round 1 starts automatically the moment every invited player has redeemed their invite.",
  gm_manual: "Round 1 only starts when you click \"Start Round 1\" yourself, whenever you're ready.",
  scheduled: "Round 1 starts automatically at a time you set, regardless of who has accepted. Anyone who hasn't redeemed their invite by then is excluded from the game entirely.",
};
const round1StartModeHint = computed(() => round1StartModeHints[round1StartMode.value]);

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
        bot_count: botMode.value ? botCount.value : undefined,
        round_resolution_mode: roundResolutionMode.value,
        allow_vote_change: allowVoteChange.value,
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
    <p class="field-hint">
      Round 1 can't start until at least 5 players have accepted their invite, whichever start mode you pick below.
    </p>
    <p class="field-hint">
      Regardless of resolution mode, you can always resolve a round early yourself once every alive player has voted.
    </p>
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
        <span class="field-hint">Identifies this game instance to you in the GM panel -- players never see it.</span>
      </label>
      <label>
        Your display name
        <input
          v-model="gmDisplayName"
          type="text"
          required
        >
        <span class="field-hint">How you appear as the Game Master in narration and the end-of-game reveal -- doesn't have to be your real name.</span>
      </label>
      <label>
        Round interval (minutes)
        <input
          v-model.number="roundIntervalMinutes"
          type="number"
          min="10"
          required
        >
        <span class="field-hint">How long each round's voting window stays open before it resolves. 10 minutes minimum -- shorter than that can miss the automatic-resolve check, which runs every 5 minutes. Use a large number (e.g. 1440 for a full day) for an async game spread over days.</span>
      </label>
      <label>
        Missed-deadline mode
        <select v-model="missedDeadlineMode">
          <option value="forfeit_fatal">Forfeit is fatal</option>
          <option value="no_consequence">No consequence</option>
          <option value="one_round_penalty">One-round penalty</option>
        </select>
        <span class="field-hint">What happens to a player who doesn't vote before the deadline. {{ missedDeadlineModeHint }}</span>
      </label>
      <label>
        Round 1 start mode
        <select v-model="round1StartMode">
          <option value="wait_for_all">Wait until everyone accepts</option>
          <option value="gm_manual">GM starts manually</option>
          <option value="scheduled">Auto-start at a scheduled time</option>
        </select>
        <span class="field-hint">How and when round 1 begins. {{ round1StartModeHint }}</span>
      </label>
      <label>
        Round resolution mode
        <select v-model="roundResolutionMode">
          <option value="manual">Always manually resolve</option>
          <option value="automatic">Automatic, once the deadline passes</option>
        </select>
        <span class="field-hint">How every round after the first one ends. {{ roundResolutionModeHint }}</span>
      </label>
      <label class="checkbox-label">
        <input
          v-model="allowVoteChange"
          type="checkbox"
        >
        Allow players to change their vote
      </label>
      <span class="field-hint">
        If off (default), a vote is final the moment it's cast. If on, a player can re-vote as many times as they want before the round resolves -- only their latest vote(s) count.
      </span>
      <label class="checkbox-label">
        <input
          v-model="botMode"
          type="checkbox"
        >
        Bot mode
      </label>
      <span class="field-hint">
        Fills the game with algorithm-controlled players (random moves for now) so you can test a full game solo. You still need at least one real player besides yourself -- bots supplement a game, they don't replace it.
      </span>
      <label v-if="botMode">
        Number of bots
        <select v-model.number="botCount">
          <option
            v-for="n in botCountOptions"
            :key="n"
            :value="n"
          >
            {{ n }}
          </option>
        </select>
        <span class="field-hint">How many bots to add alongside the real players you invite (max 19, and bots + real players together should stay within the 20-player ceiling).</span>
      </label>
      <label>
        Setup secret
        <input
          v-model="setupSecret"
          type="password"
          required
        >
        <span class="field-hint">A shared secret that proves you're allowed to create a game -- separate from the invite links you'll send players.</span>
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

.checkbox-label {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--nbr-space-2);
}

.checkbox-label input {
  width: auto;
}

.field-hint {
  display: block;
  color: var(--nbr-muted);
  font-size: 0.85em;
  font-weight: normal;
  margin-top: var(--nbr-space-1);
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
