<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useGameStore } from "../../stores/game";
import { usePushNotifications } from "../../composables/usePushNotifications";
import PowerUseControls from "./PowerUseControls.vue";

const { t } = useI18n();
const game = useGameStore();
const push = usePushNotifications();

async function toggleNotifications() {
  if (push.state.value === "subscribed") {
    await push.unsubscribe();
  } else {
    await push.subscribe();
  }
}

const notificationsLabel = computed(() => {
  if (push.pending.value) return t("notifications.updating");
  return push.state.value === "subscribed" ? t("notifications.disable") : t("notifications.enable");
});
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

    <div
      v-if="push.state.value !== 'unsupported'"
      class="notifications"
    >
      <button
        type="button"
        :disabled="push.pending.value || push.state.value === 'denied'"
        @click="toggleNotifications"
      >
        {{ notificationsLabel }}
      </button>
      <p
        v-if="push.state.value === 'denied'"
        class="field-hint"
      >
        {{ t("notifications.deniedHint") }}
      </p>
    </div>
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

.notifications {
  margin-top: var(--nbr-space-3);
}

.field-hint {
  color: var(--nbr-muted);
  font-size: 0.85em;
  margin-top: var(--nbr-space-1);
}
</style>
