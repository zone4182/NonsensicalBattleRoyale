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
// this for a ghost -- exactly the isGhost case above) reads as "nothing to vote on
// yet," not "unlimited votes" -- only a positive remaining count opens the modal.
const votesRemaining = computed(() => game.yourStatus?.votesRemainingThisRound ?? 0);
const canVote = computed(() => votesRemaining.value > 0);

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
        {{ canVote ? "Vote" : "Vote cast" }}
      </button>
      <p
        v-if="!canVote"
        class="vote-status"
      >
        You've cast your vote this round -- it's final.
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
