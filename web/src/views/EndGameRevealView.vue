<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useGameStore } from "../stores/game";
import { useSessionStore } from "../stores/session";
import { useApiCall } from "../composables/useApiCall";
import FullscreenLayout from "../layouts/FullscreenLayout.vue";
import PlaceholderVisual from "../components/PlaceholderVisual.vue";

const { t } = useI18n();
const router = useRouter();
const game = useGameStore();
const session = useSessionStore();
const { run } = useApiCall();

onMounted(() => {
  if (session.token) run(() => game.refresh(session.token as string));
});

// The GM has no personal win/lose outcome (yourStatus.outcome stays null for them, see
// get-game-state/index.ts) -- 'neutral' picks a third epilogue variant for that case
// instead of forcing a win/lose framing onto someone who wasn't a contestant.
const epilogueVariant = computed(() => game.yourStatus?.outcome ?? "neutral");

function openGameStats() {
  router.push({ name: "game-stats" });
}
</script>

<template>
  <FullscreenLayout>
    <h1>{{ t("endGameReveal.title") }}</h1>

    <!--
      Placeholder epilogue -- a dramatic closing scene is meant to go here, its content
      branching on how the game ended for this viewer (see concept docs for the win/
      lose narrative beats). Not written yet; this establishes the conditional shape.
    -->
    <section class="epilogue pixel-frame">
      <p class="placeholder-tag">
        {{ t("common.placeholder") }}
      </p>
      <PlaceholderVisual :caption="t(`endGameReveal.epilogue.${epilogueVariant}`)" />
    </section>

    <section class="panel pixel-frame">
      <p>{{ t("endGameReveal.body") }}</p>
      <button
        type="button"
        @click="openGameStats"
      >
        {{ t("endGameReveal.showGameStats") }}
      </button>
    </section>
  </FullscreenLayout>
</template>

<style scoped>
.epilogue {
  margin-top: var(--nbr-space-3);
  padding: var(--nbr-space-3);
}

.placeholder-tag {
  display: inline-block;
  margin: 0 0 var(--nbr-space-2) 0;
  padding: 0 4px;
  font-size: 0.75em;
  color: var(--nbr-bg);
  background: var(--nbr-accent);
}

.panel {
  margin-top: var(--nbr-space-3);
  padding: var(--nbr-space-3);
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-3);
}
</style>
