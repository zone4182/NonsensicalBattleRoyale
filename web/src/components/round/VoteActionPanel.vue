<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useGameStore } from "../../stores/game";

// Deliberately small and separate from the roster (GAME-DESIGN.md §UI Layout) -- opens
// the private vote modal as its own route rather than an inline click-to-vote panel.
const { t } = useI18n();
const router = useRouter();
const game = useGameStore();

const isGhost = computed(() => game.yourStatus?.status === "ghost");
// game.currentRound (not votesRemainingRaw) is the real signal for "is there anything
// to vote on right now" -- votesRemainingRaw is null both when there's no open round
// AND once yourStatus has genuinely loaded with nothing to report, so defaulting it to
// 0 and reading that as "entitlement exhausted" produced a false "you've cast your
// vote, it's final" before round 1 even starts (or between rounds), when no vote had
// been cast at all.
const hasOpenRound = computed(() => game.currentRound !== null);
const votesRemainingRaw = computed(() => game.yourStatus?.votesRemainingThisRound ?? null);
const votesRemaining = computed(() => votesRemainingRaw.value ?? 0);
// A player can lock their own vote in early (lock-vote), which overrides
// games.allow_vote_change for them specifically -- see submit-vote/index.ts's matching
// check. Locked always wins over the game-wide setting.
const voteLocked = computed(() => game.yourStatus?.voteLockedThisRound ?? false);
// Entitlement exhausted, but games.allow_vote_change lets a fresh submit-vote call
// replace the existing cast rather than being rejected -- see submit-vote/index.ts.
const canChangeVote = computed(() => votesRemainingRaw.value === 0 && game.allowVoteChange && !voteLocked.value);
const canVote = computed(() => hasOpenRound.value && ((votesRemaining.value > 0 && !voteLocked.value) || canChangeVote.value));
// This round's entitlement, not "has cast a double vote yet" -- stays true for the
// whole round (win or lose the badge as votes get cast) so the double-vote holder
// always knows going in, not just while votesRemaining still happens to read 2.
const isDoubleVoteHolder = computed(() => game.yourStatus?.isDoubleVoteHolder ?? false);

function openVoteModal() {
  if (!canVote.value) return;
  router.push({ name: "private-vote" });
}
</script>

<template>
  <div class="vote-action-panel">
    <template v-if="isGhost">
      <p class="vote-status">
        {{ t("voteAction.ghostNotice") }}
      </p>
    </template>
    <template v-else-if="!hasOpenRound">
      <p class="vote-status">
        {{ t("voteAction.noOpenRound") }}
      </p>
    </template>
    <template v-else>
      <p
        v-if="isDoubleVoteHolder"
        class="double-vote-alert"
      >
        <span
          class="alarm-icon"
          aria-hidden="true"
        >⚠</span>
        {{ t("voteAction.doubleVoteAlert") }}
      </p>
      <button
        type="button"
        :disabled="!canVote"
        @click="openVoteModal"
      >
        {{ canChangeVote ? t("voteAction.changeVote") : canVote ? t("voteAction.vote") : t("voteAction.voteCast") }}
      </button>
      <p
        v-if="voteLocked"
        class="vote-status"
      >
        {{ t("voteAction.votedLocked") }}
      </p>
      <p
        v-else-if="!votesRemaining && !canChangeVote"
        class="vote-status"
      >
        {{ t("voteAction.votedFinal") }}
      </p>
      <p
        v-else-if="canChangeVote"
        class="vote-status"
      >
        {{ t("voteAction.votedChangeable") }}
      </p>
    </template>
    <RouterLink
      :to="{ name: 'helpline' }"
      class="help-link"
    >
      {{ t("voteAction.help") }}
    </RouterLink>
  </div>
</template>

<style scoped>
.vote-action-panel {
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-2);
}

.vote-status {
  color: var(--nbr-muted);
  font-size: 0.85em;
  margin-top: var(--nbr-space-1);
}

.double-vote-alert {
  display: flex;
  align-items: center;
  gap: var(--nbr-space-1);
  margin: 0;
  padding: var(--nbr-space-1) var(--nbr-space-2);
  color: var(--nbr-danger);
  border: 1px solid var(--nbr-danger);
  font-size: 0.85em;
}

.alarm-icon {
  font-size: 1.1em;
  line-height: 1;
}

.help-link {
  display: block;
  text-align: center;
  text-decoration: none;
  background: var(--nbr-bg-raised);
  color: var(--nbr-muted);
  border: 1px solid var(--nbr-border);
  padding: var(--nbr-space-2) var(--nbr-space-3);
  font-size: 0.85em;
}

.help-link:hover {
  color: var(--nbr-fg);
  border-color: var(--nbr-accent);
}
</style>
