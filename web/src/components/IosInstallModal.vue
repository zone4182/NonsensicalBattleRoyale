<script setup lang="ts">
import { useI18n } from "vue-i18n";

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();
</script>

<template>
  <div
    v-if="open"
    class="modal-backdrop"
    @click.self="emit('close')"
  >
    <section class="modal-panel pixel-frame">
      <h2>{{ t("iosInstall.title") }}</h2>
      <ol class="steps">
        <li>{{ t("iosInstall.step1") }}</li>
        <li>{{ t("iosInstall.step2") }}</li>
        <li>{{ t("iosInstall.step3") }}</li>
      </ol>
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
}

.steps {
  padding-left: var(--nbr-space-3);
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-2);
  margin: var(--nbr-space-3) 0;
}

.modal-panel button {
  width: 100%;
}
</style>
