<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useGameStore } from "../../stores/game";
import { POWERS_CATALOGUE, powerSetupBlock } from "../../constants/powers";
import PowerUseControls from "./PowerUseControls.vue";

const { t } = useI18n();
const game = useGameStore();

// Same Powers-vs-Items split as the GM setup screen (informational/defensive =
// Powers, offensive/chaos = Items) -- purely presentational grouping, both still come
// from the same held-powers list.
function blockOf(powerKey: string): "powers" | "items" {
  const entry = POWERS_CATALOGUE.find((p) => p.key === powerKey);
  return entry ? powerSetupBlock(entry.category) : "powers";
}
const powersHeld = computed(() => (game.yourStatus?.heldPowers ?? []).filter((p) => blockOf(p.powerKey) === "powers"));
const itemsHeld = computed(() => (game.yourStatus?.heldPowers ?? []).filter((p) => blockOf(p.powerKey) === "items"));
</script>

<template>
  <div
    id="your-status-panel"
    class="your-status"
  >
    <h2>{{ t("yourStatus.title") }}</h2>
    <p>{{ game.yourStatus?.status ?? t("yourStatus.unknown") }}</p>
    <p
      v-if="game.moveToRoom"
      class="points"
    >
      {{ t("yourStatus.points", { points: game.moveToRoom.points }) }}
    </p>

    <template v-if="powersHeld.length || itemsHeld.length">
      <div
        v-if="powersHeld.length"
        id="your-status-powers-block"
      >
        <h3>{{ t("gmSetup.powers.catalogueHeading") }}</h3>
        <ul class="power-list">
          <li
            v-for="p in powersHeld"
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
      <div
        v-if="itemsHeld.length"
        id="your-status-items-block"
      >
        <h3>{{ t("gmSetup.powers.itemsHeading") }}</h3>
        <ul class="power-list">
          <li
            v-for="p in itemsHeld"
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
    <p
      v-else
      class="field-hint"
    >
      {{ t("yourStatus.noPowers") }}
    </p>
  </div>
</template>

<style scoped>
.points {
  color: var(--nbr-accent);
  font-weight: bold;
}

.your-status h3 {
  margin-top: var(--nbr-space-3);
  font-size: 0.95em;
  color: var(--nbr-muted);
}

.power-list {
  list-style: none;
  padding: 0;
  margin-top: var(--nbr-space-1);
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-2);
}

.field-hint {
  color: var(--nbr-muted);
  font-size: 0.85em;
}
</style>
