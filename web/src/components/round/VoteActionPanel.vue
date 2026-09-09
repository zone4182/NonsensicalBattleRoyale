<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useGameStore } from "../../stores/game";

// Deliberately small and separate from the roster (GAME-DESIGN.md §UI Layout) -- opens
// the private vote modal as its own route rather than an inline click-to-vote panel.
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
        You're a ghost -- spectating only. (Seance, GAME-DESIGN.md's ghost-only vote on
        this round's narration flavor, isn't wired up yet.)
      </p>
    </template>
    <template v-else>
      <button
        type="button"
        :disabled="!canVote"
        @click="openVoteModal"
      >
        {{ canChangeVote ? "Change vote" : canVote ? "Vote" : "Vote cast" }}
      </button>
      <p
        v-if="!votesRemaining && !canChangeVote"
        class="vote-status"
      >
        You've cast your vote this round -- it's final.
      </p>
      <p
        v-else-if="canChangeVote"
        class="vote-status"
      >
        You've voted, but can still change your mind before this round resolves.
      </p>
    </template>
  </div>
</template>

<style scoped>
.vote-status {
  color: var(--nbr-muted);
  font-size: 0.85em;
  margin-top: var(--nbr-space-1);
}
</style>
