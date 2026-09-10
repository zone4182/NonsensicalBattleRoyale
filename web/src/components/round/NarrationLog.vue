<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useGameStore } from "../../stores/game";

const { t } = useI18n();
const game = useGameStore();
</script>

<template>
  <div class="narration-log">
    <h2>{{ t("narrationLog.title") }}</h2>
    <p v-if="!game.narrationEntries.length">
      {{ t("narrationLog.empty") }}
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
