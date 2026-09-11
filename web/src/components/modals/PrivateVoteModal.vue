<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useGameStore } from "../../stores/game";
import { useSessionStore } from "../../stores/session";
import { useApiCall } from "../../composables/useApiCall";
import { usePoll } from "../../composables/usePoll";
import { useGameFinishedRedirect } from "../../composables/useGameFinishedRedirect";
import { callFunction, ApiCallError } from "../../lib/api";

const POLL_INTERVAL_MS = 15_000;

// Deliberately its own route (not a v-if inside MainRoundView): votes must stay
// anonymous even in the UI's own visual language, so this must never share a DOM tree
// with the public roster panel. See GAME-DESIGN.md §UI Layout.
const { t } = useI18n();
const router = useRouter();
const game = useGameStore();
const session = useSessionStore();
const { run } = useApiCall();

useGameFinishedRedirect();

const candidates = computed(() => game.players.filter((p) => p.role === "player"));
// null (roster/status not loaded yet, e.g. a direct/bookmarked navigation here before
// this component's own onMounted refresh resolves) reads as "not yet known" -- treated
// as votable so the guard below doesn't bounce someone out before their real status has
// even loaded. It only ever comes from get-game-state as an explicit number once loaded.
const votesRemaining = computed(() => game.yourStatus?.votesRemainingThisRound ?? null);
const voteLocked = computed(() => game.yourStatus?.voteLockedThisRound ?? false);
// Entitlement exhausted (0, not null/unknown) is still votable when the game allows
// changing a vote -- submit-vote replaces the existing cast instead of rejecting it.
// Locking always wins over allow_vote_change, same as VoteActionPanel's gate.
const canVote = computed(
  () =>
    !voteLocked.value &&
    (votesRemaining.value === null || votesRemaining.value > 0 || (votesRemaining.value === 0 && game.allowVoteChange)),
);
// Shown whenever change is even possible for this player -- lock-vote itself rejects
// with `no_vote_cast` if nothing's been cast yet, surfaced as a normal error below
// rather than trying to infer "has cast at least one" purely client-side.
const canOfferLock = computed(() => game.allowVoteChange && !voteLocked.value);
// This round's entitlement, not "has cast a double vote yet" -- stays true regardless
// of how many of the two votes are already cast, same reasoning as VoteActionPanel's
// own copy of this flag.
const isDoubleVoteHolder = computed(() => game.yourStatus?.isDoubleVoteHolder ?? false);

const REASON_MAX_LENGTH = 100;

// Single-vote path (everyone who isn't this round's double-vote holder).
const selectedId = ref<string | null>(null);
const reason = ref("");
const pending = ref(false);
const errorMessage = ref<string | null>(null);

// Double-vote path: two independent slots, submitted together via submit-double-vote
// (see that function's own comment for why it replaces the whole choice set atomically
// instead of reusing submit-vote's single-slot "make room" logic).
const selectedId1 = ref<string | null>(null);
const selectedId2 = ref<string | null>(null);
const reason1 = ref("");
const reason2 = ref("");
const doublePending = ref(false);
const doubleErrorMessage = ref<string | null>(null);

const lockPending = ref(false);
const lockErrorMessage = ref<string | null>(null);

const VOTE_ERROR_MESSAGES: Record<string, string> = {
  no_open_round: t("privateVote.errors.noOpenRound"),
  invalid_target: t("privateVote.errors.invalidTarget"),
  vote_entitlement_exhausted: t("privateVote.errors.voteEntitlementExhausted"),
  vote_locked: t("privateVote.errors.voteLocked"),
};

const DOUBLE_VOTE_ERROR_MESSAGES: Record<string, string> = {
  no_open_round: t("privateVote.errors.noOpenRound"),
  invalid_target: t("privateVote.errors.invalidTarget"),
  vote_locked: t("privateVote.errors.voteLocked"),
  not_double_vote_holder: t("privateVote.errors.notDoubleVoteHolder"),
};

const LOCK_ERROR_MESSAGES: Record<string, string> = {
  no_open_round: t("privateVote.errors.noOpenRound"),
  no_vote_cast: t("privateVote.errors.noVoteCast"),
};

// Always refreshes on mount, even when a roster is already cached (e.g. from
// MainRoundView) -- candidate status here gates who's actually votable (the radio's own
// :disabled below), so a roster left stale by the background poll's up-to-15s cadence
// could otherwise still show a just-eliminated player as alive and selectable for that
// window. submit-vote would still reject it server-side, but the vote screen itself
// should never present a ghost as choosable in the first place.
onMounted(() => {
  if (session.token) run(() => game.refresh(session.token as string));
});

// A player could sit on this screen (open, but undecided) for a while -- without its
// own poll, a roster fetched only once on mount could still go stale mid-visit (e.g.
// the GM resolves the round while this stays open), leaving a since-eliminated
// candidate looking alive and selectable for as long as the screen stays open, not just
// the up-to-15s gap the mount-time refresh above closes.
usePoll(() => {
  if (session.token) game.refresh(session.token);
}, POLL_INTERVAL_MS);

// Defense in depth against reaching this route with nothing left to spend (e.g. the
// browser back/forward button after already voting) -- VoteActionPanel is the normal
// gate, submit-vote is the real enforcement, this just avoids showing a live-looking
// ballot the submit would immediately reject.
watch(
  canVote,
  (value) => {
    if (!value) router.push({ name: "main-round" });
  },
  { immediate: true },
);

// Reopening this screen after already voting used to show a blank ballot -- the form's
// own local state, not the vote itself, was what reset. get-game-state now reports the
// voter's own active vote(s) back (never another player's, see getActiveVoteTargetsForVoter
// in db.ts), so this prefills the selection(s) the first time they become available.
// Single-vote path only runs once selectedId is still unset, so it never clobbers a
// selection already in progress if the store refreshes again via the background poll
// while this screen is open; the double-vote path applies the same guard per slot.
watch(
  () => game.yourStatus?.activeVotes ?? [],
  (activeVotes) => {
    if (isDoubleVoteHolder.value) {
      if (selectedId1.value === null && activeVotes[0]) {
        selectedId1.value = activeVotes[0].targetPlayerId;
        reason1.value = activeVotes[0].reason ?? "";
      }
      if (selectedId2.value === null && activeVotes[1]) {
        selectedId2.value = activeVotes[1].targetPlayerId;
        reason2.value = activeVotes[1].reason ?? "";
      }
      return;
    }
    if (selectedId.value !== null || activeVotes.length === 0) return;
    const mostRecent = activeVotes[activeVotes.length - 1];
    selectedId.value = mostRecent.targetPlayerId;
    reason.value = mostRecent.reason ?? "";
  },
  { immediate: true },
);

async function confirmVote() {
  const token = session.token;
  if (!selectedId.value || !token) return;
  pending.value = true;
  errorMessage.value = null;
  try {
    await callFunction("submit-vote", { target_player_id: selectedId.value, reason: reason.value.trim() || undefined }, { token });
    await game.refresh(token);
    router.push({ name: "main-round" });
  } catch (err) {
    errorMessage.value = err instanceof ApiCallError ? (VOTE_ERROR_MESSAGES[err.code] ?? err.message) : t("common.somethingWentWrong");
  } finally {
    pending.value = false;
  }
}

async function confirmDoubleVote() {
  const token = session.token;
  if ((!selectedId1.value && !selectedId2.value) || !token) return;
  doublePending.value = true;
  doubleErrorMessage.value = null;
  try {
    const votes = [
      selectedId1.value ? { target_player_id: selectedId1.value, reason: reason1.value.trim() || undefined } : null,
      selectedId2.value ? { target_player_id: selectedId2.value, reason: reason2.value.trim() || undefined } : null,
    ].filter((v): v is { target_player_id: string; reason: string | undefined } => v !== null);
    await callFunction("submit-double-vote", { votes }, { token });
    await game.refresh(token);
    router.push({ name: "main-round" });
  } catch (err) {
    doubleErrorMessage.value =
      err instanceof ApiCallError ? (DOUBLE_VOTE_ERROR_MESSAGES[err.code] ?? err.message) : t("common.somethingWentWrong");
  } finally {
    doublePending.value = false;
  }
}

function close() {
  router.push({ name: "main-round" });
}

async function lockVote() {
  const token = session.token;
  if (!token) return;
  lockPending.value = true;
  lockErrorMessage.value = null;
  try {
    await callFunction("lock-vote", {}, { token });
    await game.refresh(token);
    router.push({ name: "main-round" });
  } catch (err) {
    lockErrorMessage.value = err instanceof ApiCallError ? (LOCK_ERROR_MESSAGES[err.code] ?? err.message) : t("common.somethingWentWrong");
  } finally {
    lockPending.value = false;
  }
}
</script>

<template>
  <section class="screen private-vote-modal">
    <h1>{{ t("privateVote.title") }}</h1>
    <p>{{ t("privateVote.subtitle") }}</p>

    <template v-if="isDoubleVoteHolder">
      <p class="double-vote-explainer">
        <span
          class="alarm-icon"
          aria-hidden="true"
        >⚠</span>
        {{ t("privateVote.doubleVoteExplainer") }}
      </p>
      <div
        v-if="candidates.length"
        class="double-columns"
      >
        <section class="vote-column">
          <h2>{{ t("privateVote.voteHeading", { number: 1 }) }}</h2>
          <ul class="candidate-list">
            <li
              v-for="player in candidates"
              :key="player.id"
            >
              <label>
                <input
                  type="radio"
                  name="vote-target-1"
                  :value="player.id"
                  :checked="selectedId1 === player.id"
                  :disabled="player.status !== 'alive'"
                  @change="selectedId1 = player.id"
                >
                {{ player.displayName }}
                <span v-if="player.status !== 'alive'">{{ t("privateVote.ghostSuffix") }}</span>
              </label>
            </li>
          </ul>
          <label class="reason-label">
            {{ t("privateVote.reasonLabel") }}
            <textarea
              v-model="reason1"
              :maxlength="REASON_MAX_LENGTH"
              rows="2"
              :placeholder="t('privateVote.reasonPlaceholder')"
            />
            <span class="reason-count">{{ reason1.length }}/{{ REASON_MAX_LENGTH }}</span>
          </label>
        </section>

        <section class="vote-column">
          <h2>{{ t("privateVote.voteHeading", { number: 2 }) }}</h2>
          <ul class="candidate-list">
            <li
              v-for="player in candidates"
              :key="player.id"
            >
              <label>
                <input
                  type="radio"
                  name="vote-target-2"
                  :value="player.id"
                  :checked="selectedId2 === player.id"
                  :disabled="player.status !== 'alive'"
                  @change="selectedId2 = player.id"
                >
                {{ player.displayName }}
                <span v-if="player.status !== 'alive'">{{ t("privateVote.ghostSuffix") }}</span>
              </label>
            </li>
          </ul>
          <label class="reason-label">
            {{ t("privateVote.reasonLabel") }}
            <textarea
              v-model="reason2"
              :maxlength="REASON_MAX_LENGTH"
              rows="2"
              :placeholder="t('privateVote.reasonPlaceholder')"
            />
            <span class="reason-count">{{ reason2.length }}/{{ REASON_MAX_LENGTH }}</span>
          </label>
        </section>
      </div>
      <p v-else>
        {{ t("privateVote.noRoster") }}
      </p>
      <p
        v-if="doubleErrorMessage"
        class="error"
      >
        {{ doubleErrorMessage }}
      </p>
      <div class="actions">
        <button
          type="button"
          :disabled="(!selectedId1 && !selectedId2) || doublePending || !canVote"
          @click="confirmDoubleVote"
        >
          {{ doublePending ? t("privateVote.casting") : t("privateVote.confirmBothVotes") }}
        </button>
        <button
          type="button"
          @click="close"
        >
          {{ t("common.close") }}
        </button>
      </div>
    </template>

    <template v-else>
      <ul
        v-if="candidates.length"
        class="candidate-list"
      >
        <li
          v-for="player in candidates"
          :key="player.id"
        >
          <label>
            <input
              type="radio"
              name="vote-target"
              :value="player.id"
              :checked="selectedId === player.id"
              :disabled="player.status !== 'alive'"
              @change="selectedId = player.id"
            >
            {{ player.displayName }}
            <span v-if="player.status !== 'alive'">{{ t("privateVote.ghostSuffix") }}</span>
          </label>
        </li>
      </ul>
      <p v-else>
        {{ t("privateVote.noRoster") }}
      </p>
      <label class="reason-label">
        {{ t("privateVote.reasonLabel") }}
        <textarea
          v-model="reason"
          :maxlength="REASON_MAX_LENGTH"
          rows="2"
          :placeholder="t('privateVote.reasonPlaceholder')"
        />
        <span class="reason-count">{{ reason.length }}/{{ REASON_MAX_LENGTH }}</span>
      </label>
      <p
        v-if="errorMessage"
        class="error"
      >
        {{ errorMessage }}
      </p>
      <div class="actions">
        <button
          type="button"
          :disabled="!selectedId || pending || !canVote"
          @click="confirmVote"
        >
          {{ pending ? t("privateVote.casting") : t("privateVote.confirmVote") }}
        </button>
        <button
          type="button"
          @click="close"
        >
          {{ t("common.close") }}
        </button>
      </div>
    </template>

    <div
      v-if="canOfferLock"
      class="lock-block"
    >
      <p class="field-hint">
        {{ isDoubleVoteHolder ? t("privateVote.lockHintDouble") : t("privateVote.lockHint") }}
      </p>
      <button
        type="button"
        class="lock-button"
        :disabled="lockPending"
        @click="lockVote"
      >
        {{ lockPending ? t("privateVote.locking") : t("privateVote.lockVote") }}
      </button>
      <p
        v-if="lockErrorMessage"
        class="error"
      >
        {{ lockErrorMessage }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.candidate-list {
  list-style: none;
  padding: 0;
}

.double-vote-explainer {
  display: flex;
  align-items: center;
  gap: var(--nbr-space-2);
  padding: var(--nbr-space-2) var(--nbr-space-3);
  margin-top: var(--nbr-space-2);
  color: var(--nbr-danger);
  border: 1px solid var(--nbr-danger);
}

.alarm-icon {
  font-size: 1.2em;
  line-height: 1;
}

.double-columns {
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-3);
  margin-top: var(--nbr-space-3);
}

@media (min-width: 561px) {
  .double-columns {
    flex-direction: row;
  }

  .vote-column {
    flex: 1;
    min-width: 0;
  }
}

.vote-column h2 {
  font-size: 1em;
  margin-bottom: var(--nbr-space-1);
}

.reason-label {
  display: block;
  margin-top: var(--nbr-space-3);
}

.reason-label textarea {
  display: block;
  width: 100%;
  margin-top: var(--nbr-space-1);
  background: var(--nbr-bg-raised);
  color: var(--nbr-fg);
  border: 1px solid var(--nbr-border);
  padding: var(--nbr-space-2);
  font-family: inherit;
  resize: vertical;
}

.reason-count {
  display: block;
  text-align: right;
  color: var(--nbr-muted);
  font-size: 0.85em;
}

.error {
  color: var(--nbr-danger);
}

.actions {
  display: flex;
  gap: var(--nbr-space-2);
  margin-top: var(--nbr-space-3);
}

.lock-block {
  margin-top: var(--nbr-space-4);
  padding-top: var(--nbr-space-3);
  border-top: 1px solid var(--nbr-border);
}

.lock-button {
  border-color: var(--nbr-danger);
  color: var(--nbr-danger);
}

.field-hint {
  color: var(--nbr-muted);
  font-size: 0.85em;
  margin: 0 0 var(--nbr-space-2) 0;
}
</style>
