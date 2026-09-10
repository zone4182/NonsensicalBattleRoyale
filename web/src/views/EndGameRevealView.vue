<script setup lang="ts">
import { useI18n } from "vue-i18n";
import FullscreenLayout from "../layouts/FullscreenLayout.vue";

const { t } = useI18n();
</script>

<template>
  <FullscreenLayout>
    <h1>{{ t("endGameReveal.title") }}</h1>
    <section class="panel pixel-frame">
      <p>{{ t("endGameReveal.body") }}</p>
    </section>
  </FullscreenLayout>
</template>

<style scoped>
.panel {
  margin-top: var(--nbr-space-3);
  padding: var(--nbr-space-3);
}
</style>
