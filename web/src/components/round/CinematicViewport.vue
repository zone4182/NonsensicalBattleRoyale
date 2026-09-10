<script setup lang="ts">
import { useUiStore } from "../../stores/ui";
import ImageCarousel from "./ImageCarousel.vue";

// Collapses to zero height when idle (GAME-DESIGN.md §UI Layout). Nothing sets
// cinematicActive/cinematicImages yet -- see ui.ts for what's deferred.
const ui = useUiStore();
</script>

<template>
  <div
    v-if="ui.cinematicActive"
    class="cinematic-viewport"
  >
    <ImageCarousel
      :images="ui.cinematicImages"
      :interval-ms="ui.cinematicIntervalMs"
    />
  </div>
</template>

<style scoped>
.cinematic-viewport {
  border: 1px solid var(--nbr-border);
}
</style>
