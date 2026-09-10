<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useGameStore } from "../stores/game";
import { useSessionStore } from "../stores/session";
import { usePoll } from "../composables/usePoll";
import FullscreenLayout from "../layouts/FullscreenLayout.vue";

// Story text: concept/story/the-story-2.0.md, Phase 3 (Arrival) + Phase 4 (The
// Awakening and a Dark Discovery), English version. <Game Master> is swapped for the
// real GM's display name where we have it; "one of you" stands in for the fictional
// "randomly chosen player" rather than naming a real player for something that didn't
// actually happen to them.
const POLL_INTERVAL_MS = 15_000;

const { t } = useI18n();
const router = useRouter();
const game = useGameStore();
const session = useSessionStore();

const gmName = computed(() => game.players.find((p) => p.role === "gm")?.displayName ?? t("arrival.gmFallbackName"));

// Round 1's start trigger is configurable per game (GAME-DESIGN.md) -- a player can
// land here well before there's anything to continue on to.
const canContinue = computed(() => game.phase !== null && game.phase !== "setup");

onMounted(() => {
  if (session.token) game.refresh(session.token);
});

usePoll(() => {
  if (session.token) game.refresh(session.token);
}, POLL_INTERVAL_MS);

function proceed() {
  router.push({ name: "main-round" });
}
</script>

<template>
  <FullscreenLayout>
    <h1>{{ t("arrival.title") }}</h1>
    <section class="story-block pixel-frame">
      <p>{{ t("arrival.storyPart1a") }}</p>
      <p>{{ t("arrival.storyPart1b") }}</p>
    </section>

    <h2>{{ t("arrival.nextMorning") }}</h2>
    <section class="story-block pixel-frame">
      <p>{{ t("arrival.storyPart2a", { gmName }) }}</p>
      <p>{{ t("arrival.storyPart2b") }}</p>
    </section>

    <div class="continue-block">
      <button
        v-if="canContinue"
        type="button"
        @click="proceed"
      >
        {{ t("arrival.continue") }}
      </button>
      <p
        v-else
        class="field-hint"
      >
        {{ t("arrival.waiting") }}
      </p>
    </div>
  </FullscreenLayout>
</template>

<style scoped>
.story-block {
  padding: var(--nbr-space-3);
  margin-bottom: var(--nbr-space-3);
}

.story-block p {
  margin: 0 0 var(--nbr-space-2) 0;
}

.story-block p:last-child {
  margin-bottom: 0;
}

.continue-block {
  margin-top: var(--nbr-space-3);
}

.field-hint {
  color: var(--nbr-muted);
  font-size: 0.85em;
}
</style>
