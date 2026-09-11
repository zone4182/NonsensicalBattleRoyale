<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useGameStore } from "../../stores/game";
import { useSessionStore } from "../../stores/session";
import { callFunction, ApiCallError } from "../../lib/api";

// Deliberately its own route (not a v-if inside MainRoundView): votes must stay
// anonymous even in the UI's own visual language, so this must never share a DOM tree
// with the public roster panel. See GAME-DESIGN.md §UI Layout.
const { t } = useI18n();
const router = useRouter();
const game = useGameStore();
const session = useSessionStore();

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

const REASON_MAX_LENGTH = 100;

const selectedId = ref<string | null>(null);
const reason = ref("");
const pending = ref(false);
const errorMessage = ref<string | null>(null);
const lockPending = ref(false);
const lockErrorMessage = ref<string | null>(null);

const VOTE_ERROR_MESSAGES: Record<string, string> = {
  no_open_round: t("privateVote.errors.noOpenRound"),
  invalid_target: t("privateVote.errors.invalidTarget"),
  vote_entitlement_exhausted: t("privateVote.errors.voteEntitlementExhausted"),
  vote_locked: t("privateVote.errors.voteLocked"),
};

const LOCK_ERROR_MESSAGES: Record<string, string> = {
  no_open_round: t("privateVote.errors.noOpenRound"),
  no_vote_cast: t("privateVote.errors.noVoteCast"),
};

onMounted(() => {
  if (game.players.length === 0 && session.token) {
    game.refresh(session.token);
  }
});

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

    <div
      v-if="canOfferLock"
      class="lock-block"
    >
      <p class="field-hint">
        {{ t("privateVote.lockHint") }}
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
