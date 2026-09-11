<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { callFunction, ApiCallError } from "../../lib/api";

const { t } = useI18n();

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
const doubleVoteEnabled = ref(true);
const doubleVoteFloorRounds = ref(2);
// Extensible on purpose -- 'random' is the existing coin-flip-among-the-tied
// behavior; 'no_elimination' is new. More tie-break strategies can be added to this
// list later without touching anything else here.
const tieBreakMode = ref<"random" | "no_elimination">("random");
const moveToRoomEnabled = ref(false);

const roundResolutionModeHint = computed(() => t(`gmSetup.rules.roundResolutionHints.${roundResolutionMode.value}`));
const missedDeadlineModeHint = computed(() => t(`gmSetup.rules.missedDeadlineHints.${missedDeadlineMode.value}`));
const round1StartModeHint = computed(() => t(`gmSetup.rules.round1StartHints.${round1StartMode.value}`));
const tieBreakModeHint = computed(() => t(`gmSetup.rules.tieBreakHints.${tieBreakMode.value}`));

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
        tie_break_mode: tieBreakMode.value,
        double_vote_enabled: doubleVoteEnabled.value,
        double_vote_floor_rounds: doubleVoteEnabled.value ? doubleVoteFloorRounds.value : undefined,
        move_to_room_enabled: moveToRoomEnabled.value,
      },
      { extraHeaders: { "x-setup-secret": setupSecret.value } },
    );
    created.value = res;
  } catch (err) {
    errorMessage.value = err instanceof ApiCallError ? err.message : t("common.somethingWentWrong");
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
    <h1>{{ t("gmSetup.title") }}</h1>
    <p>{{ t("gmSetup.description") }}</p>
    <p class="field-hint">
      {{ t("gmSetup.minPlayersHint") }}
    </p>
    <p class="field-hint">
      {{ t("gmSetup.manualResolveHint") }}
    </p>

    <!--
      Mobile: panels stack in reading order. Tablet and up (>=721px, same threshold
      as MainRoundView/GmInvitesView): a 2-column grid, so the form doesn't read as
      one very long column on wider screens.
    -->
    <form
      class="setup-form"
      @submit.prevent="createGame"
    >
      <div class="setup-layout">
        <section class="panel pixel-frame">
          <h2>{{ t("gmSetup.basics.heading") }}</h2>
          <label>
            {{ t("gmSetup.basics.gameName") }}
            <input
              v-model="name"
              type="text"
              required
            >
            <span class="field-hint">{{ t("gmSetup.basics.gameNameHint") }}</span>
          </label>
          <label>
            {{ t("gmSetup.basics.displayName") }}
            <input
              v-model="gmDisplayName"
              type="text"
              required
            >
            <span class="field-hint">{{ t("gmSetup.basics.displayNameHint") }}</span>
          </label>
        </section>

        <section class="panel pixel-frame">
          <h2>{{ t("gmSetup.rules.heading") }}</h2>
          <label>
            {{ t("gmSetup.rules.roundInterval") }}
            <input
              v-model.number="roundIntervalMinutes"
              type="number"
              min="10"
              required
            >
            <span class="field-hint">{{ t("gmSetup.rules.roundIntervalHint") }}</span>
          </label>
          <label>
            {{ t("gmSetup.rules.missedDeadlineMode") }}
            <select v-model="missedDeadlineMode">
              <option value="forfeit_fatal">{{ t("gmSetup.rules.missedDeadlineOptions.forfeitFatal") }}</option>
              <option value="no_consequence">{{ t("gmSetup.rules.missedDeadlineOptions.noConsequence") }}</option>
              <option value="one_round_penalty">{{ t("gmSetup.rules.missedDeadlineOptions.oneRoundPenalty") }}</option>
            </select>
            <span class="field-hint">{{ t("gmSetup.rules.missedDeadlineHintPrefix") }} {{ missedDeadlineModeHint }}</span>
          </label>
          <label>
            {{ t("gmSetup.rules.tieBreakMode") }}
            <select v-model="tieBreakMode">
              <option value="random">{{ t("gmSetup.rules.tieBreakOptions.random") }}</option>
              <option value="no_elimination">{{ t("gmSetup.rules.tieBreakOptions.noElimination") }}</option>
            </select>
            <span class="field-hint">{{ t("gmSetup.rules.tieBreakHintPrefix") }} {{ tieBreakModeHint }}</span>
          </label>
          <label>
            {{ t("gmSetup.rules.round1StartMode") }}
            <select v-model="round1StartMode">
              <option value="wait_for_all">{{ t("gmSetup.rules.round1StartOptions.waitForAll") }}</option>
              <option value="gm_manual">{{ t("gmSetup.rules.round1StartOptions.gmManual") }}</option>
              <option value="scheduled">{{ t("gmSetup.rules.round1StartOptions.scheduled") }}</option>
            </select>
            <span class="field-hint">{{ t("gmSetup.rules.round1StartHintPrefix") }} {{ round1StartModeHint }}</span>
          </label>
          <label>
            {{ t("gmSetup.rules.roundResolutionMode") }}
            <select v-model="roundResolutionMode">
              <option value="manual">{{ t("gmSetup.rules.roundResolutionOptions.manual") }}</option>
              <option value="automatic">{{ t("gmSetup.rules.roundResolutionOptions.automatic") }}</option>
            </select>
            <span class="field-hint">{{ t("gmSetup.rules.roundResolutionHintPrefix") }} {{ roundResolutionModeHint }}</span>
          </label>
          <label class="checkbox-label">
            <input
              v-model="allowVoteChange"
              type="checkbox"
            >
            {{ t("gmSetup.rules.allowVoteChange") }}
          </label>
          <span class="field-hint">
            {{ t("gmSetup.rules.allowVoteChangeHint") }}
          </span>
        </section>

        <section class="panel pixel-frame">
          <h2>{{ t("gmSetup.powers.heading") }}</h2>
          <label class="checkbox-label">
            <input
              v-model="doubleVoteEnabled"
              type="checkbox"
            >
            {{ t("gmSetup.powers.doubleVoteEnabled") }}
          </label>
          <span class="field-hint">
            {{ t("gmSetup.powers.doubleVoteEnabledHint") }}
          </span>
          <label v-if="doubleVoteEnabled">
            {{ t("gmSetup.powers.doubleVoteFloorRounds") }}
            <input
              v-model.number="doubleVoteFloorRounds"
              type="number"
              min="-1"
              required
            >
            <span class="field-hint">{{ t("gmSetup.powers.doubleVoteFloorRoundsHint") }}</span>
          </label>
          <label class="checkbox-label">
            <input
              v-model="botMode"
              type="checkbox"
            >
            {{ t("gmSetup.powers.botMode") }}
          </label>
          <span class="field-hint">
            {{ t("gmSetup.powers.botModeHint") }}
          </span>
          <label v-if="botMode">
            {{ t("gmSetup.powers.botCount") }}
            <select v-model.number="botCount">
              <option
                v-for="n in botCountOptions"
                :key="n"
                :value="n"
              >
                {{ n }}
              </option>
            </select>
            <span class="field-hint">{{ t("gmSetup.powers.botCountHint") }}</span>
          </label>
        </section>

        <section class="panel pixel-frame">
          <h2>{{ t("gmSetup.miniGames.heading") }}</h2>
          <label class="checkbox-label">
            <input
              v-model="moveToRoomEnabled"
              type="checkbox"
            >
            {{ t("gmSetup.miniGames.moveToRoomEnabled") }}
          </label>
          <span class="field-hint">
            {{ t("gmSetup.miniGames.moveToRoomEnabledHint") }}
          </span>
        </section>

        <section class="panel pixel-frame">
          <h2>{{ t("gmSetup.access.heading") }}</h2>
          <label>
            {{ t("gmSetup.access.setupSecret") }}
            <input
              v-model="setupSecret"
              type="password"
              required
            >
            <span class="field-hint">{{ t("gmSetup.access.setupSecretHint") }}</span>
          </label>
        </section>
      </div>

      <button
        type="submit"
        :disabled="pending"
      >
        {{ pending ? t("gmSetup.creating") : t("gmSetup.createGame") }}
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
      <p>{{ t("gmSetup.created") }}</p>
      <code>{{ created.gm_invite_token }}</code>
      <button
        type="button"
        @click="copyToken"
      >
        {{ t("gmSetup.copy") }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.setup-form {
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-3);
}

.setup-layout {
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-3);
  margin-top: var(--nbr-space-3);
}

@media (min-width: 721px) {
  /* A strict 2-column grid row-locks panels of very different lengths together (e.g.
     the short "Game basics" panel next to the much longer "Round rules" one), leaving
     a large empty gap below the short one instead of letting the next panel start
     there. Multi-column flow self-balances regardless of how panel lengths change as
     fields get added/removed later. */
  .setup-layout {
    display: block;
    columns: 2;
    column-gap: var(--nbr-space-3);
  }

  .panel {
    break-inside: avoid;
    margin-bottom: var(--nbr-space-3);
  }
}

.panel {
  padding: var(--nbr-space-3);
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-2);
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
