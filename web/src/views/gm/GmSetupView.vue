<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { callFunction, ApiCallError } from "../../lib/api";
import { useSessionStore } from "../../stores/session";
import { JUST_CREATED_INVITES_KEY } from "../../lib/justCreatedInvites";
import { DEFAULT_ENABLED_POWER_KEYS, POWERS_CATALOGUE, powerSetupBlock } from "../../constants/powers";

const { t } = useI18n();
const router = useRouter();
const session = useSessionStore();

interface CreateGameResponse {
  game_id: string;
  gm_invite_token: string;
}

interface RedeemResponse {
  player_id: string;
  role: "player" | "gm";
  game_id: string;
  game_phase: string;
  display_name: string;
}

interface CreateInviteResponse {
  invite_id: string;
  token: string;
  display_name: string;
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
// Refinement of the 'no_elimination' mode -- caps how many consecutive ties are
// allowed before the game forces a resolution instead of stalling indefinitely. -1
// disables it (default); only shown/meaningful when tieBreakMode is 'no_elimination'.
const maxConsecutiveTies = ref(-1);
const maxTiesBehavior = ref<"coin_flip" | "least_votes_dies">("coin_flip");
const moveToRoomEnabled = ref(false);
const threeDoorsDeadlineMinutes = ref(10);

// GM-configurable per-power enable/disable, seeded from the catalogue's own defaults
// (mirrors powers_catalogue.default_enabled -- every power on except false_flag).
// Split into two presentation-only blocks, see constants/powers.ts.
const powerEnabled = ref<Record<string, boolean>>(
  Object.fromEntries(POWERS_CATALOGUE.map((p) => [p.key, DEFAULT_ENABLED_POWER_KEYS.has(p.key)])),
);
// Whether bots are also allowed to receive each power (random drop or earned
// trigger) -- on by default, independent of whether the power itself is enabled.
const powerBotEligible = ref<Record<string, boolean>>(Object.fromEntries(POWERS_CATALOGUE.map((p) => [p.key, true])));
const powersBlockCatalogue = computed(() => POWERS_CATALOGUE.filter((p) => powerSetupBlock(p.category) === "powers"));
const itemsBlockCatalogue = computed(() => POWERS_CATALOGUE.filter((p) => powerSetupBlock(p.category) === "items"));

const roundResolutionModeHint = computed(() => t(`gmSetup.rules.roundResolutionHints.${roundResolutionMode.value}`));
const missedDeadlineModeHint = computed(() => t(`gmSetup.rules.missedDeadlineHints.${missedDeadlineMode.value}`));
const round1StartModeHint = computed(() => t(`gmSetup.rules.round1StartHints.${round1StartMode.value}`));
const tieBreakModeHint = computed(() => t(`gmSetup.rules.tieBreakHints.${tieBreakMode.value}`));

// Draft player invites -- collected here, but not actually created (create-invite)
// until the game itself exists. There is no live invite object to show
// redeemed/pending status for during the wizard, unlike the old standalone Invites
// screen -- just the list of names the GM intends to send once the game is real.
const draftInvites = ref<string[]>([]);
const newInviteName = ref("");

function addDraftInvite() {
  const trimmed = newInviteName.value.trim();
  if (!trimmed) return;
  draftInvites.value.push(trimmed);
  newInviteName.value = "";
}

function removeDraftInvite(index: number) {
  draftInvites.value.splice(index, 1);
}

// Wizard steps, in the exact order requested: the setup secret first (it gates
// everything else server-side anyway), mini-games last before invites, invites last
// of all -- creating the game is the final action of the last step, not a separate
// step of its own.
const STEPS = ["secret", "basics", "rules", "powers", "miniGames", "invites"] as const;
type StepKey = (typeof STEPS)[number];
const currentStepIndex = ref(0);
const currentStep = computed<StepKey>(() => STEPS[currentStepIndex.value]);

// Deliberately light-touch -- just enough to stop someone from reaching the final
// "create game" action with an obviously-empty required field, not a full re-validation
// of every constraint the server already enforces (round interval minimums, etc. keep
// their native input `min`/`required` attributes for in-place feedback).
const stepIsValid = computed<Record<StepKey, boolean>>(() => ({
  secret: setupSecret.value.trim().length > 0,
  basics: name.value.trim().length > 0 && gmDisplayName.value.trim().length > 0,
  rules:
    roundIntervalMinutes.value >= 10 &&
    threeDoorsDeadlineMinutes.value >= 1 &&
    (maxConsecutiveTies.value === -1 || maxConsecutiveTies.value >= 2),
  powers: !doubleVoteEnabled.value || doubleVoteFloorRounds.value >= -1,
  miniGames: true,
  invites: true,
}));
const canAdvance = computed(() => stepIsValid.value[currentStep.value]);

function goNext() {
  if (!canAdvance.value) return;
  if (currentStepIndex.value < STEPS.length - 1) currentStepIndex.value += 1;
}

function goBack() {
  if (currentStepIndex.value > 0) currentStepIndex.value -= 1;
}

// Only lets the GM jump back to an already-visited step, never forward past one that
// hasn't been validated yet -- same reasoning as a linear wizard's Next button, just
// also reachable from the step indicator itself.
function jumpTo(index: number) {
  if (index <= currentStepIndex.value) currentStepIndex.value = index;
}

const pending = ref(false);
const errorMessage = ref<string | null>(null);

async function createGame() {
  pending.value = true;
  errorMessage.value = null;
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
        max_consecutive_ties: tieBreakMode.value === "no_elimination" ? maxConsecutiveTies.value : undefined,
        max_ties_behavior: tieBreakMode.value === "no_elimination" ? maxTiesBehavior.value : undefined,
        double_vote_enabled: doubleVoteEnabled.value,
        double_vote_floor_rounds: doubleVoteEnabled.value ? doubleVoteFloorRounds.value : undefined,
        move_to_room_enabled: moveToRoomEnabled.value,
        three_doors_deadline_minutes: threeDoorsDeadlineMinutes.value,
        power_settings: powerEnabled.value,
        power_bot_settings: powerBotEligible.value,
      },
      { extraHeaders: { "x-setup-secret": setupSecret.value } },
    );

    // Auto-redeem the GM's own invite immediately -- detaching creation from
    // management means the GM should land in the management hub already
    // authenticated, not holding a token they still have to go redeem themselves.
    const redeemed = await callFunction<RedeemResponse>("redeem-invite", { token: res.gm_invite_token }, {});
    session.setSession({
      token: res.gm_invite_token,
      role: "gm",
      playerId: redeemed.player_id,
      gameId: res.game_id,
      displayName: gmDisplayName.value,
    });

    // Every drafted invite becomes a real one now that the game (and a session to
    // create them with) actually exists. Their tokens are only ever shown once --
    // stashed for the management hub's first render to display, then gone (see
    // lib/justCreatedInvites.ts).
    const createdInvites: { display_name: string; token: string }[] = [];
    for (const displayName of draftInvites.value) {
      const invite = await callFunction<CreateInviteResponse>(
        "create-invite",
        { display_name: displayName },
        { token: res.gm_invite_token },
      );
      createdInvites.push({ display_name: invite.display_name, token: invite.token });
    }
    if (createdInvites.length > 0) {
      sessionStorage.setItem(JUST_CREATED_INVITES_KEY, JSON.stringify(createdInvites));
    }

    router.push({ name: "gm-in-play" });
  } catch (err) {
    errorMessage.value = err instanceof ApiCallError ? err.message : t("common.somethingWentWrong");
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <div id="gm-setup-screen">
    <h1>{{ t("gmSetup.title") }}</h1>
    <p>{{ t("gmSetup.description") }}</p>
    <p class="field-hint">
      {{ t("gmSetup.minPlayersHint") }}
    </p>
    <p class="field-hint">
      {{ t("gmSetup.manualResolveHint") }}
    </p>

    <ol
      id="gm-setup-wizard-steps"
      class="wizard-steps"
    >
      <li
        v-for="(step, index) in STEPS"
        :key="step"
        :class="{ active: index === currentStepIndex, done: index < currentStepIndex, clickable: index <= currentStepIndex }"
        @click="jumpTo(index)"
      >
        {{ index + 1 }}. {{ t(`gmSetup.wizard.stepLabels.${step}`) }}
      </li>
    </ol>

    <form
      class="setup-form"
      @submit.prevent="currentStepIndex === STEPS.length - 1 ? createGame() : goNext()"
    >
      <section
        v-if="currentStep === 'secret'"
        id="gm-setup-step-secret-panel"
        class="panel pixel-frame"
      >
        <h2>{{ t("gmSetup.access.heading") }}</h2>
        <label>
          {{ t("gmSetup.access.setupSecret") }}
          <input
            v-model="setupSecret"
            type="password"
            required
            autofocus
          >
          <span class="field-hint">{{ t("gmSetup.access.setupSecretHint") }}</span>
        </label>
      </section>

      <section
        v-else-if="currentStep === 'basics'"
        id="gm-setup-step-basics-panel"
        class="panel pixel-frame"
      >
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

      <section
        v-else-if="currentStep === 'rules'"
        id="gm-setup-step-rules-panel"
        class="panel pixel-frame"
      >
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
        <template v-if="tieBreakMode === 'no_elimination'">
          <label>
            {{ t("gmSetup.rules.maxConsecutiveTies") }}
            <input
              v-model.number="maxConsecutiveTies"
              type="number"
              min="-1"
              required
            >
            <span class="field-hint">{{ t("gmSetup.rules.maxConsecutiveTiesHint") }}</span>
          </label>
          <label v-if="maxConsecutiveTies !== -1">
            {{ t("gmSetup.rules.maxTiesBehavior") }}
            <select v-model="maxTiesBehavior">
              <option value="coin_flip">{{ t("gmSetup.rules.maxTiesBehaviorOptions.coinFlip") }}</option>
              <option value="least_votes_dies">{{ t("gmSetup.rules.maxTiesBehaviorOptions.leastVotesDies") }}</option>
            </select>
            <span class="field-hint">{{ t(`gmSetup.rules.maxTiesBehaviorHints.${maxTiesBehavior}`) }}</span>
          </label>
        </template>
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
        <label>
          {{ t("gmSetup.rules.threeDoorsDeadlineMinutes") }}
          <input
            v-model.number="threeDoorsDeadlineMinutes"
            type="number"
            min="1"
            required
          >
          <span class="field-hint">{{ t("gmSetup.rules.threeDoorsDeadlineMinutesHint") }}</span>
        </label>
      </section>

      <section
        v-else-if="currentStep === 'powers'"
        id="gm-setup-step-powers-panel"
        class="panel pixel-frame"
      >
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
        <span
          v-if="doubleVoteEnabled"
          class="field-hint disclaimer"
        >
          {{ t("gmSetup.powers.doubleVoteRound1Disclaimer") }}
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

        <hr>
        <h3>{{ t("gmSetup.powers.catalogueHeading") }}</h3>
        <p class="field-hint">
          {{ t("gmSetup.powers.catalogueHint") }}
        </p>
        <div
          id="gm-setup-powers-block"
          class="power-block"
        >
          <div
            v-for="power in powersBlockCatalogue"
            :id="`gm-setup-power-row-${power.key}`"
            :key="power.key"
            class="power-row"
          >
            <label class="checkbox-label power-toggle">
              <input
                v-model="powerEnabled[power.key]"
                type="checkbox"
              >
              <span>
                <strong>{{ t(`gmSetup.powers.catalogue.${power.key}.label`) }}</strong>
                <span class="field-hint power-description">{{ t(`gmSetup.powers.catalogue.${power.key}.description`) }}</span>
              </span>
            </label>
            <label class="checkbox-label bot-eligible-toggle">
              <input
                v-model="powerBotEligible[power.key]"
                type="checkbox"
              >
              {{ t("gmSetup.powers.botEligible") }}
            </label>
          </div>
        </div>

        <hr>
        <h3>{{ t("gmSetup.powers.itemsHeading") }}</h3>
        <p class="field-hint">
          {{ t("gmSetup.powers.itemsHint") }}
        </p>
        <div
          id="gm-setup-items-block"
          class="power-block"
        >
          <div
            v-for="power in itemsBlockCatalogue"
            :id="`gm-setup-power-row-${power.key}`"
            :key="power.key"
            class="power-row"
          >
            <label class="checkbox-label power-toggle">
              <input
                v-model="powerEnabled[power.key]"
                type="checkbox"
              >
              <span>
                <strong>{{ t(`gmSetup.powers.catalogue.${power.key}.label`) }}</strong>
                <span class="field-hint power-description">{{ t(`gmSetup.powers.catalogue.${power.key}.description`) }}</span>
              </span>
            </label>
            <label class="checkbox-label bot-eligible-toggle">
              <input
                v-model="powerBotEligible[power.key]"
                type="checkbox"
              >
              {{ t("gmSetup.powers.botEligible") }}
            </label>
          </div>
        </div>
      </section>

      <section
        v-else-if="currentStep === 'miniGames'"
        id="gm-setup-step-minigames-panel"
        class="panel pixel-frame"
      >
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

      <section
        v-else-if="currentStep === 'invites'"
        id="gm-setup-step-invites-panel"
        class="panel pixel-frame"
      >
        <h2>{{ t("gmSetup.invites.heading") }}</h2>
        <p class="field-hint">
          {{ t("gmSetup.invites.description") }}
        </p>
        <div class="invite-add-row">
          <input
            v-model="newInviteName"
            type="text"
            :placeholder="t('gmSetup.invites.namePlaceholder')"
            @keydown.enter.prevent="addDraftInvite"
          >
          <button
            type="button"
            :disabled="!newInviteName.trim()"
            @click="addDraftInvite"
          >
            {{ t("gmSetup.invites.addInvite") }}
          </button>
        </div>
        <p
          v-if="draftInvites.length === 0"
          class="field-hint"
        >
          {{ t("gmSetup.invites.noneYetHint") }}
        </p>
        <ul
          v-else
          class="draft-invite-list"
        >
          <li
            v-for="(draftName, index) in draftInvites"
            :key="index"
          >
            {{ draftName }}
            <button
              type="button"
              class="remove-button"
              @click="removeDraftInvite(index)"
            >
              {{ t("gmSetup.invites.remove") }}
            </button>
          </li>
        </ul>
      </section>

      <p
        v-if="errorMessage"
        class="error"
      >
        {{ errorMessage }}
      </p>

      <div class="wizard-actions">
        <button
          type="button"
          :disabled="currentStepIndex === 0"
          @click="goBack"
        >
          {{ t("gmSetup.wizard.back") }}
        </button>
        <button
          v-if="currentStepIndex < STEPS.length - 1"
          type="submit"
          :disabled="!canAdvance"
        >
          {{ t("gmSetup.wizard.next") }}
        </button>
        <button
          v-else
          type="submit"
          :disabled="pending"
        >
          {{ pending ? t("gmSetup.creating") : t("gmSetup.createGame") }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.setup-form {
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-3);
}

.wizard-steps {
  display: flex;
  flex-wrap: wrap;
  gap: var(--nbr-space-2) var(--nbr-space-3);
  list-style: none;
  padding: 0;
  margin: var(--nbr-space-3) 0 0 0;
  border-bottom: 1px solid var(--nbr-border);
  padding-bottom: var(--nbr-space-2);
}

.wizard-steps li {
  color: var(--nbr-muted);
  font-size: 0.85em;
  cursor: default;
}

.wizard-steps li.clickable {
  cursor: pointer;
}

.wizard-steps li.done {
  color: var(--nbr-fg);
}

.wizard-steps li.active {
  color: var(--nbr-accent);
  font-weight: bold;
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

.field-hint.disclaimer {
  color: var(--nbr-danger);
}

.power-block {
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-2);
}

.power-row {
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-1);
  padding: var(--nbr-space-2);
  border: 1px solid var(--nbr-border);
}

.power-toggle {
  align-items: flex-start;
}

.power-toggle input {
  margin-top: 0.2em;
}

.power-description {
  margin-top: 0;
}

.bot-eligible-toggle {
  margin-left: var(--nbr-space-4);
  color: var(--nbr-muted);
  font-size: 0.85em;
}

.error {
  color: var(--nbr-danger);
}

.invite-add-row {
  display: flex;
  gap: var(--nbr-space-2);
}

.invite-add-row input {
  flex: 1;
}

.draft-invite-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-1);
}

.draft-invite-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--nbr-space-2);
  padding: var(--nbr-space-1) var(--nbr-space-2);
  background: var(--nbr-bg-raised);
  border: 1px solid var(--nbr-border);
}

.remove-button {
  background: none;
  color: var(--nbr-danger);
  border: 1px solid var(--nbr-danger);
  padding: 0 var(--nbr-space-2);
  font-size: 0.8em;
  width: auto;
}

.wizard-actions {
  display: flex;
  gap: var(--nbr-space-2);
}

.wizard-actions button {
  flex: 1;
}
</style>
