<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import FullscreenLayout from "../layouts/FullscreenLayout.vue";
import IosInstallModal from "../components/IosInstallModal.vue";
import { useInstallPrompt } from "../composables/useInstallPrompt";

const { t } = useI18n();
const { canInstall, canShowIosInstructions, promptInstall } = useInstallPrompt();
const showIosModal = ref(false);
</script>

<template>
  <FullscreenLayout>
    <div class="home-content">
      <h1>{{ t("home.title") }}</h1>
      <p class="subtitle">
        {{ t("home.subtitle") }}
      </p>
      <p class="tagline">
        {{ t("home.tagline") }}
      </p>
      <div class="actions">
        <RouterLink
          :to="{ name: 'gm-setup' }"
          class="action action-primary"
        >
          {{ t("home.hostGame") }}
        </RouterLink>
        <RouterLink
          :to="{ name: 'join' }"
          class="action"
        >
          {{ t("home.joinGame") }}
        </RouterLink>
      </div>
    </div>
    <footer class="home-footer">
      <button
        v-if="canInstall"
        type="button"
        class="install-button"
        @click="promptInstall"
      >
        {{ t("home.installApp") }}
      </button>
      <button
        v-else-if="canShowIosInstructions"
        type="button"
        class="install-button"
        @click="showIosModal = true"
      >
        {{ t("home.installApp") }}
      </button>
      <p class="credit">
        {{ t("home.credit") }}
      </p>
    </footer>
    <IosInstallModal
      :open="showIosModal"
      @close="showIosModal = false"
    />
  </FullscreenLayout>
</template>

<style scoped>
.home-content {
  text-align: center;
}

.subtitle {
  color: var(--nbr-accent);
  font-family: var(--nbr-font-display);
  font-size: 1em;
  margin-top: var(--nbr-space-2);
}

.tagline {
  color: var(--nbr-muted);
  max-width: 46ch;
  margin-top: var(--nbr-space-3);
  margin-left: auto;
  margin-right: auto;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-2);
  max-width: 320px;
  margin: var(--nbr-space-4) auto 0;
}

.action {
  display: block;
  text-align: center;
  text-decoration: none;
  background: var(--nbr-bg-raised);
  color: var(--nbr-fg);
  border: 1px solid var(--nbr-border);
  padding: var(--nbr-space-2) var(--nbr-space-3);
}

.action:hover {
  border-color: var(--nbr-accent);
}

.action-primary {
  color: var(--nbr-accent);
  border-color: var(--nbr-accent);
}

.home-footer {
  margin-top: var(--nbr-space-4);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--nbr-space-2);
}

.install-button {
  background: none;
  color: var(--nbr-muted);
  border: 1px solid var(--nbr-border);
  padding: var(--nbr-space-1) var(--nbr-space-3);
  font-family: inherit;
  font-size: 0.85em;
}

.install-button:hover {
  color: var(--nbr-fg);
  border-color: var(--nbr-accent);
}

.credit {
  color: var(--nbr-muted);
  font-size: 0.75em;
  margin: 0;
}
</style>
