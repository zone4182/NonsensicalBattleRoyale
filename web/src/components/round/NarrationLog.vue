<script setup lang="ts">
import { useGameStore } from "../../stores/game";

const game = useGameStore();
</script>

<template>
  <div class="narration-log">
    <h2>Narration</h2>
    <p v-if="!game.narrationEntries.length">
      Bart's ghost has nothing to say yet.
    </p>
    <p
      v-for="entry in game.narrationEntries"
      :key="entry.id"
    >
      {{ entry.text }}
    </p>
  </div>
</template>

<style scoped>
.narration-log {
  overflow-y: auto;
}
</style>
