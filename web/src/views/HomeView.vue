<script setup lang="ts">
import { useI18n } from "vue-i18n";
import FullscreenLayout from "../layouts/FullscreenLayout.vue";

const { t } = useI18n();
</script>

<template>
  <FullscreenLayout>
    <div class="home-content">
      <h1>{{ t("home.title") }}</h1>
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
  </FullscreenLayout>
</template>

<style scoped>
.home-content {
  text-align: center;
}

.tagline {
  color: var(--nbr-muted);
  max-width: 46ch;
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
</style>
