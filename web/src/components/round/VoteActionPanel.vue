<script setup lang="ts">
import { useRouter } from "vue-router";

// Deliberately small and separate from the roster (GAME-DESIGN.md §UI Layout) -- opens
// the private vote modal as its own route rather than an inline click-to-vote panel.
const router = useRouter();

function openVoteModal() {
  router.push({ name: "private-vote" });
}
</script>

<template>
  <div class="vote-action-panel">
    <button
      type="button"
      @click="openVoteModal"
    >
      Vote
    </button>
  </div>
</template>
