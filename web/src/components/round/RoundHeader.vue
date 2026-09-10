<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useGameStore } from "../../stores/game";

const { t } = useI18n();
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
  if (remainingMs <= 0) return t("roundHeader.deadlinePassed");

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return t("roundHeader.countdown", { days, hours: pad(hours), minutes: pad(minutes), seconds: pad(seconds) });
});

// Raw ISO strings ("2026-09-10T09:35:52.038Z") don't fit narrow screens and wrap
// mid-string -- this is what the countdown above is for anyway, so the absolute time
// only needs to be a short, glanceable anchor, not a full timestamp.
const deadlineLabel = computed(() => {
  const deadline = game.currentRound?.votingDeadlineAt;
  if (!deadline) return "–";
  return new Date(deadline).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
});
</script>

<template>
  <header class="round-header">
    <div class="round-header-row">
      <span>{{ t("roundHeader.round", { number: game.currentRound?.roundNumber ?? "–" }) }}</span>
      <span>{{ t("roundHeader.deadline", { deadline: deadlineLabel }) }}</span>
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
  flex-wrap: wrap;
  gap: var(--nbr-space-1) var(--nbr-space-3);
  justify-content: space-between;
}

.round-header-row span {
  white-space: nowrap;
}

.countdown {
  margin-top: var(--nbr-space-1);
  color: var(--nbr-accent);
  font-size: 1.1em;
  text-align: right;
}
</style>
