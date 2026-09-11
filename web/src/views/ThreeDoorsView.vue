<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useGameStore } from "../stores/game";
import { useSessionStore } from "../stores/session";
import { useApiCall } from "../composables/useApiCall";
import { usePoll } from "../composables/usePoll";
import { useGameFinishedRedirect } from "../composables/useGameFinishedRedirect";
import { callFunction, ApiCallError } from "../lib/api";
import FullscreenLayout from "../layouts/FullscreenLayout.vue";

const POLL_INTERVAL_MS = 15_000;

const { t } = useI18n();
const router = useRouter();
const game = useGameStore();
const session = useSessionStore();
const { run } = useApiCall();
const picked = ref<number | null>(null);
const pending = ref(false);
const errorMessage = ref<string | null>(null);

useGameFinishedRedirect();

const DOOR_ERROR_MESSAGES: Record<string, string> = {
  not_three_doors_phase: t("threeDoors.errors.notThreeDoorsPhase"),
  invalid_door_number: t("threeDoors.errors.invalidDoorNumber"),
};

onMounted(() => {
  if (session.token) run(() => game.refresh(session.token as string));
});

usePoll(() => {
  if (session.token) game.refresh(session.token);
}, POLL_INTERVAL_MS);

// The reveal (collision vs. unique picks, or a missed deadline) happens server-side
// once every remaining player has picked (or the deadline passes) -- this is what
// notices that happened and moves on.
watch(
  () => game.phase,
  (phase) => {
    if (phase === "ended") router.push({ name: "end-game-reveal" });
  },
);

// Reopening this screen (or loading it fresh after a poll tick) used to always show an
// unpicked ballot -- get-game-state now reports back whichever door this player already
// chose (never another player's, same "own choice only" reasoning as the private vote
// screen's own prefill), so a returning visitor sees their pick still stands.
watch(
  () => game.threeDoors?.yourPick ?? null,
  (yourPick) => {
    if (picked.value === null && yourPick !== null) picked.value = yourPick;
  },
  { immediate: true },
);

// Same countdown-tick pattern as RoundHeader, just against Three Doors' own deadline
// instead of a round's voting_deadline_at.
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
  const deadline = game.threeDoors?.deadlineAt;
  if (!deadline) return null;

  const remainingMs = new Date(deadline).getTime() - now.value;
  if (remainingMs <= 0) return t("threeDoors.deadlinePassed");

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return t("threeDoors.countdown", { hours: pad(hours), minutes: pad(minutes), seconds: pad(seconds) });
});

async function pick(doorNumber: number) {
  if (!session.token || pending.value) return;
  pending.value = true;
  errorMessage.value = null;
  try {
    await callFunction("submit-door-pick", { door_number: doorNumber }, { token: session.token });
    picked.value = doorNumber;
  } catch (err) {
    errorMessage.value = err instanceof ApiCallError ? (DOOR_ERROR_MESSAGES[err.code] ?? err.message) : t("common.somethingWentWrong");
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <FullscreenLayout>
    <h1>{{ t("threeDoors.title") }}</h1>
    <!--
      Placeholder prologue -- a short cinematic beat is meant to precede the door
      choice itself (see concept/mini-games/three-doors.md), but the actual scripted
      narration text isn't written yet. This block exists so the screen's shape and
      pacing (prologue, then countdown, then the choice) is already in place.
    -->
    <section class="prologue pixel-frame">
      <p class="placeholder-tag">
        {{ t("common.placeholder") }}
      </p>
      <p>{{ t("threeDoors.prologuePlaceholder") }}</p>
    </section>
    <p>{{ t("threeDoors.description") }}</p>
    <p
      v-if="countdown"
      class="countdown"
    >
      {{ countdown }}
    </p>
    <p class="deadline-warning">
      {{ t("threeDoors.deadlineWarning") }}
    </p>
    <div class="doors">
      <button
        v-for="n in [1, 2, 3]"
        :key="n"
        type="button"
        :disabled="picked !== null || pending"
        @click="pick(n)"
      >
        {{ t("threeDoors.door", { number: n }) }}
      </button>
    </div>
    <p v-if="picked !== null">
      {{ t("threeDoors.picked", { number: picked }) }}
    </p>
    <p
      v-if="errorMessage"
      class="error"
    >
      {{ errorMessage }}
    </p>
  </FullscreenLayout>
</template>

<style scoped>
.prologue {
  padding: var(--nbr-space-3);
  margin-top: var(--nbr-space-3);
}

.placeholder-tag {
  display: inline-block;
  margin: 0 0 var(--nbr-space-2) 0;
  padding: 0 4px;
  font-size: 0.75em;
  color: var(--nbr-bg);
  background: var(--nbr-accent);
}

.countdown {
  margin-top: var(--nbr-space-2);
  color: var(--nbr-accent);
  font-size: 1.2em;
}

.deadline-warning {
  color: var(--nbr-danger);
  font-size: 0.85em;
}

.doors {
  display: flex;
  flex-wrap: wrap;
  gap: var(--nbr-space-3);
  margin-top: var(--nbr-space-3);
}

.error {
  color: var(--nbr-danger);
}
</style>
