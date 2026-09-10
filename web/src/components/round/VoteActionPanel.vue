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
// null (no open round, e.g. still in setup, or -- since get-game-state never computes
// this for a ghost -- exactly the isGhost case above) reads as "nothing to vote on yet."
const votesRemainingRaw = computed(() => game.yourStatus?.votesRemainingThisRound ?? null);
const votesRemaining = computed(() => votesRemainingRaw.value ?? 0);
// Entitlement exhausted, but games.allow_vote_change lets a fresh submit-vote call
// replace the existing cast rather than being rejected -- see submit-vote/index.ts.
const canChangeVote = computed(() => votesRemainingRaw.value === 0 && game.allowVoteChange);
const canVote = computed(() => votesRemaining.value > 0 || canChangeVote.value);

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
    <template v-else>
      <button
        type="button"
        :disabled="!canVote"
        @click="openVoteModal"
      >
        {{ canChangeVote ? t("voteAction.changeVote") : canVote ? t("voteAction.vote") : t("voteAction.voteCast") }}
      </button>
      <p
        v-if="!votesRemaining && !canChangeVote"
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
