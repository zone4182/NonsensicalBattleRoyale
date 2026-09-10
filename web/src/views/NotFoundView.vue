<script setup lang="ts">
import { useI18n } from "vue-i18n";
import FullscreenLayout from "../layouts/FullscreenLayout.vue";

const { t } = useI18n();
</script>

<template>
  <FullscreenLayout>
    <h1>{{ t("notFound.title") }}</h1>
    <p>{{ t("notFound.body") }}</p>
  </FullscreenLayout>
</template>
