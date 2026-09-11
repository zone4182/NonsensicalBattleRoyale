<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useGameStore } from "../../stores/game";
import PlaceholderVisual from "../PlaceholderVisual.vue";

// The one-time beat between round 1 (the group's decision) and round 2 (the real first
// vote) -- the "letter in the study" story content (concept/story/the-story-2.0.md
// Phase 6) that explains the voting rules. Four distinct beats (the outcome
// acknowledgment, then three story paragraphs), each with its own placeholder image --
// exactly the "multiple beats" shape the arrival cinematic already uses, so this reuses
// the same click-through slide pattern rather than one long scroll. Shown until the
// player clicks through; see lib/prologueOutcomeSeen.ts for how MainRoundView tracks
// that per game.
const { t } = useI18n();
const game = useGameStore();

const emit = defineEmits<{ continue: [] }>();

// Falls back to a neutral line if this is ever reached before the outcome has loaded --
// shouldn't normally happen since this gate only renders once round 2 is already open,
// which means round 1 has necessarily resolved.
const outcomeText = computed(() => {
  const outcome = game.previousPrologueOutcome;
  return outcome ? t(`prologueOutcome.acknowledgment.${outcome}`) : t("prologueOutcome.acknowledgment.fallback");
});

const slides = computed(() => [
  outcomeText.value,
  t("prologueOutcome.searchingHouse"),
  t("prologueOutcome.theLetter"),
  t("prologueOutcome.theRules"),
]);

const slideIndex = ref(0);
const isLastSlide = computed(() => slideIndex.value === slides.value.length - 1);

function next() {
  if (!isLastSlide.value) slideIndex.value += 1;
}
</script>

<template>
  <div class="prologue-outcome-gate">
    <PlaceholderVisual :caption="slides[slideIndex]" />

    <p
      v-if="isLastSlide"
      class="and-so-it-begins"
    >
      {{ t("prologueOutcome.andSoItBegins") }}
    </p>

    <button
      v-if="!isLastSlide"
      type="button"
      @click="next"
    >
      {{ t("prologueOutcome.next") }}
    </button>
    <button
      v-else
      type="button"
      @click="emit('continue')"
    >
      {{ t("prologueOutcome.continue") }}
    </button>
  </div>
</template>

<style scoped>
.prologue-outcome-gate {
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-2);
}

.prologue-outcome-gate p {
  margin: 0;
}

.and-so-it-begins {
  margin-top: var(--nbr-space-2);
  color: var(--nbr-accent);
  font-style: italic;
}

.prologue-outcome-gate button {
  margin-top: var(--nbr-space-2);
}
</style>
