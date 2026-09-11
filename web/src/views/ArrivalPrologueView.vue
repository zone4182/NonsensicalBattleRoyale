<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
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
//
// A short cinematic -- one beat per slide, each with a placeholder image, advanced by
// the player's own Continue click (not auto-playing). The last slide (the bathroom
// discovery) is where the story ends and gameplay begins: its Continue leads to the
// main round screen instead of another slide.
const POLL_INTERVAL_MS = 15_000;

const { t } = useI18n();
const router = useRouter();
const game = useGameStore();
const session = useSessionStore();

const gmName = computed(() => game.players.find((p) => p.role === "gm")?.displayName ?? t("arrival.gmFallbackName"));

interface Slide {
  heading: string;
  image: string;
  paragraphs: string[];
}

const slides = computed<Slide[]>(() => [
  {
    heading: t("arrival.title"),
    image: "/img/arrival-at-the-manor.png",
    paragraphs: [t("arrival.storyPart1a"), t("arrival.storyPart1b")],
  },
  {
    heading: t("arrival.nextMorning"),
    image: "/img/mansion_daytime.png",
    paragraphs: [t("arrival.storyPart2a", { gmName: gmName.value }), t("arrival.storyPart2b")],
  },
]);

const slideIndex = ref(0);
const isLastSlide = computed(() => slideIndex.value === slides.value.length - 1);

// Round 1's start trigger is configurable per game (GAME-DESIGN.md) -- a player can
// land here well before there's anything to continue on to. Only actually gates the
// very last slide's Continue -- the cinematic itself always plays regardless.
const canContinue = computed(() => game.phase !== null && game.phase !== "setup");

onMounted(() => {
  if (session.token) game.refresh(session.token);
});

usePoll(() => {
  if (session.token) game.refresh(session.token);
}, POLL_INTERVAL_MS);

function proceed() {
  if (!isLastSlide.value) {
    slideIndex.value += 1;
    return;
  }
  router.push({ name: "main-round" });
}
</script>

<template>
  <FullscreenLayout>
    <h1>{{ slides[slideIndex].heading }}</h1>
    <img
      class="slide-image"
      :src="slides[slideIndex].image"
      alt=""
    >
    <section class="story-block pixel-frame">
      <p
        v-for="(paragraph, i) in slides[slideIndex].paragraphs"
        :key="i"
      >
        {{ paragraph }}
      </p>
    </section>

    <p class="slide-progress">
      {{ t("arrival.slideProgress", { current: slideIndex + 1, total: slides.length }) }}
    </p>

    <div class="continue-block">
      <button
        v-if="!isLastSlide"
        type="button"
        @click="proceed"
      >
        {{ t("arrival.continue") }}
      </button>
      <template v-else>
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
      </template>
    </div>
  </FullscreenLayout>
</template>

<style scoped>
.slide-image {
  display: block;
  width: 100%;
  max-height: 320px;
  object-fit: cover;
  margin-top: var(--nbr-space-3);
}

.story-block {
  padding: var(--nbr-space-3);
  margin-top: var(--nbr-space-3);
  margin-bottom: 0;
}

.story-block p {
  margin: 0 0 var(--nbr-space-2) 0;
}

.story-block p:last-child {
  margin-bottom: 0;
}

.slide-progress {
  margin-top: var(--nbr-space-2);
  color: var(--nbr-muted);
  font-size: 0.8em;
  text-align: right;
}

.continue-block {
  margin-top: var(--nbr-space-3);
}

.field-hint {
  color: var(--nbr-muted);
  font-size: 0.85em;
}
</style>
