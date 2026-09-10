<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useGameStore } from "../../stores/game";
import PowerUseControls from "./PowerUseControls.vue";

const { t } = useI18n();
const game = useGameStore();
</script>

<template>
  <div class="your-status">
    <h2>{{ t("yourStatus.title") }}</h2>
    <p>{{ game.yourStatus?.status ?? t("yourStatus.unknown") }}</p>
    <ul
      v-if="game.yourStatus?.heldPowers.length"
      class="power-list"
    >
      <li
        v-for="p in game.yourStatus.heldPowers"
        :key="p.powerKey"
      >
        <PowerUseControls
          :power-key="p.powerKey"
          :category="p.category"
          :count="p.count"
        />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.power-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-2);
}
</style>
