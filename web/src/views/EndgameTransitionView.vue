<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useGameStore } from "../stores/game";
import { useSessionStore } from "../stores/session";
import { useApiCall } from "../composables/useApiCall";
import { usePoll } from "../composables/usePoll";
import { useGameFinishedRedirect } from "../composables/useGameFinishedRedirect";
import { callFunction } from "../lib/api";
import FullscreenLayout from "../layouts/FullscreenLayout.vue";
import PlaceholderVisual from "../components/PlaceholderVisual.vue";

// Shared gate in front of both endgames (concept/mini-games/russian-roulette-endgame.md)
// -- only 3 players ever reach this screen. Its own cinematic text is translatable
// frontend copy (not the server's narration_log entry, which stays English-only until
// the theme/locale content refactor CLAUDE.md describes) -- same "dedicated screen uses
// its own i18n, the log is a separate running history" split as ArrivalPrologueView and
// PrologueOutcomeGate already use.
const POLL_INTERVAL_MS = 5_000;

const { t } = useI18n();
const router = useRouter();
const game = useGameStore();
const session = useSessionStore();
const { pending, run } = useApiCall();

useGameFinishedRedirect();

const endgameMode = computed(() => game.endgameTransition?.endgameMode ?? "three_doors");
const acked = computed(() => game.endgameTransition?.acked ?? false);

async function refreshAndRedirect() {
  if (!session.token) return;
  await game.refresh(session.token);
  if (game.phase === "three_doors") {
    router.push({ name: "three-doors" });
  } else if (game.phase === "russian_roulette") {
    router.push({ name: "russian-roulette" });
  } else if (game.phase === "ended") {
    router.push({ name: "end-game-reveal" });
  }
}

onMounted(refreshAndRedirect);
usePoll(refreshAndRedirect, POLL_INTERVAL_MS);

async function continueClick() {
  const result = await run(() => callFunction("ack-endgame-transition", {}, { token: session.token as string }));
  if (result) await refreshAndRedirect();
}
</script>

<template>
  <FullscreenLayout id="endgame-transition-screen">
    <h1>{{ t("endgameTransition.title") }}</h1>
    <PlaceholderVisual :caption="t(`endgameTransition.caption.${endgameMode}`)" />
    <section class="panel pixel-frame">
      <p
        v-for="(paragraph, i) in [t(`endgameTransition.body.${endgameMode}.a`), t(`endgameTransition.body.${endgameMode}.b`)]"
        :key="i"
      >
        {{ paragraph }}
      </p>
      <button
        v-if="!acked"
        type="button"
        :disabled="pending"
        @click="continueClick"
      >
        {{ pending ? t("endgameTransition.continuing") : t("endgameTransition.continue") }}
      </button>
      <p
        v-else
        class="field-hint"
      >
        {{ t("endgameTransition.waiting") }}
      </p>
    </section>
  </FullscreenLayout>
</template>

<style scoped>
.panel {
  margin-top: var(--nbr-space-3);
  padding: var(--nbr-space-3);
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-2);
}

.field-hint {
  color: var(--nbr-muted);
  font-size: 0.85em;
}
</style>
