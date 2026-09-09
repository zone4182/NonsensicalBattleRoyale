<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useGameStore } from "../../stores/game";

const game = useGameStore();

const now = ref(Date.now());
let tickHandle: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  tickHandle = setInterval(() => {
    now.value = Date.now();
  }, 1000);
});

onBeforeUnmount(() => {
  clearInterval(tickHandle);
});

const countdown = computed(() => {
  const deadline = game.currentRound?.votingDeadlineAt;
  if (!deadline) return null;

  const remainingMs = new Date(deadline).getTime() - now.value;
  if (remainingMs <= 0) return "Deadline passed";

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
});
</script>

<template>
  <header class="round-header">
    <div class="round-header-row">
      <span>Round {{ game.currentRound?.roundNumber ?? "-" }}</span>
      <span>Deadline: {{ game.currentRound?.votingDeadlineAt ?? "-" }}</span>
    </div>
    <div
      v-if="countdown"
      class="countdown"
    >
      {{ countdown }}
    </div>
  </header>
</template>

<style scoped>
.round-header {
  border-bottom: 1px solid var(--nbr-border);
  padding-bottom: var(--nbr-space-2);
}

.round-header-row {
  display: flex;
  justify-content: space-between;
}

.countdown {
  margin-top: var(--nbr-space-1);
  color: var(--nbr-accent);
  font-size: 1.1em;
  text-align: right;
}
</style>
