<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { usePushNotifications } from "../composables/usePushNotifications";

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();
const push = usePushNotifications();

async function onToggleNotifications(event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  if (checked) {
    await push.subscribe();
  } else {
    await push.unsubscribe();
  }
}
</script>

<template>
  <div
    v-if="open"
    class="modal-backdrop"
    @click.self="emit('close')"
  >
    <section class="modal-panel pixel-frame">
      <h2>{{ t("playerSettings.title") }}</h2>

      <label
        v-if="push.state.value !== 'unsupported'"
        class="checkbox-label"
      >
        <input
          type="checkbox"
          :checked="push.state.value === 'subscribed'"
          :disabled="push.pending.value || push.state.value === 'denied'"
          @change="onToggleNotifications"
        >
        {{ t("notifications.enable") }}
      </label>
      <p
        v-if="push.state.value === 'denied'"
        class="field-hint"
      >
        {{ t("notifications.deniedHint") }}
      </p>
      <p
        v-if="push.state.value === 'unsupported'"
        class="field-hint"
      >
        {{ t("notifications.unsupportedHint") }}
      </p>

      <button
        type="button"
        @click="emit('close')"
      >
        {{ t("common.close") }}
      </button>
    </section>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--nbr-space-3);
  z-index: 100;
}

.modal-panel {
  background: var(--nbr-bg);
  padding: var(--nbr-space-3);
  max-width: 360px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-2);
}

.checkbox-label {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--nbr-space-2);
  margin-top: var(--nbr-space-2);
}

.checkbox-label input {
  width: auto;
}

.field-hint {
  color: var(--nbr-muted);
  font-size: 0.85em;
  margin: 0;
}

.modal-panel button[type="button"]:last-child {
  width: 100%;
  margin-top: var(--nbr-space-2);
}
</style>
