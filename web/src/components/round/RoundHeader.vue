<script setup lang="ts">
import { useGameStore } from "../../stores/game";

const game = useGameStore();
</script>

<template>
  <header class="round-header">
    <span>Round {{ game.currentRound?.roundNumber ?? "-" }}</span>
    <span>Deadline: {{ game.currentRound?.votingDeadlineAt ?? "-" }}</span>
  </header>
</template>

<style scoped>
.round-header {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid var(--nbr-border);
  padding-bottom: var(--nbr-space-2);
}
</style>
