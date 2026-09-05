<script setup lang="ts">
import { useUiStore } from "../../stores/ui";

// Collapses to zero height when idle (GAME-DESIGN.md §UI Layout). No real media
// handling this milestone -- just the collapse behavior.
const ui = useUiStore();
</script>

<template>
  <div
    v-if="ui.cinematicActive"
    class="cinematic-viewport"
  >
    Cinematic moment placeholder.
  </div>
</template>

<style scoped>
.cinematic-viewport {
  border: 1px solid var(--nbr-border);
  padding: var(--nbr-space-3);
}
</style>
