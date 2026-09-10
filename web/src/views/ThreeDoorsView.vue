<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useGameStore } from "../stores/game";
import { useSessionStore } from "../stores/session";
import { useApiCall } from "../composables/useApiCall";
import { usePoll } from "../composables/usePoll";
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

// The reveal (collision vs. unique picks) happens server-side once every remaining
// player has picked -- this is what notices that happened and moves on.
watch(
  () => game.phase,
  (phase) => {
    if (phase === "ended") router.push({ name: "end-game-reveal" });
  },
);

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
    <p>{{ t("threeDoors.description") }}</p>
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
.doors {
  display: flex;
  flex-wrap: wrap;
  gap: var(--nbr-space-3);
}

.error {
  color: var(--nbr-danger);
}
</style>
