<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { SUPPORTED_LOCALES, setLocale, type SupportedLocale } from "../i18n";

const { locale } = useI18n();

const current = computed({
  get: () => locale.value,
  set: (value: string) => setLocale(value as SupportedLocale),
});

const labels: Record<SupportedLocale, string> = {
  en: "EN",
  nl: "NL",
};
</script>

<template>
  <select
    v-model="current"
    class="locale-switcher"
    aria-label="Language"
  >
    <option
      v-for="loc in SUPPORTED_LOCALES"
      :key="loc"
      :value="loc"
    >
      {{ labels[loc] }}
    </option>
  </select>
</template>

<style scoped>
.locale-switcher {
  background: var(--nbr-bg-raised);
  color: var(--nbr-fg);
  border: 1px solid var(--nbr-border);
  padding: var(--nbr-space-1) var(--nbr-space-2);
  font-family: inherit;
  font-size: 0.85em;
}
</style>
