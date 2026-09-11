<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useSessionStore } from "../stores/session";
import { useApiCall } from "../composables/useApiCall";
import { callFunction } from "../lib/api";
import FullscreenLayout from "../layouts/FullscreenLayout.vue";
import PlaceholderVisual from "../components/PlaceholderVisual.vue";

const { t } = useI18n();

// No endpoint yet describes the real per-round narration options -- this is a fixed
// placeholder list. Future milestone scope: server-driven per-round option sets.
const NARRATION_OPTIONS = ["somber", "theatrical", "mysterious", "blunt"];

const session = useSessionStore();
const { pending, run } = useApiCall();
const selected = ref<string | null>(null);
const submitted = ref(false);

async function cast(option: string) {
  if (!session.token) return;
  selected.value = option;
  const result = await run(() => callFunction("seance-vote", { narration_option: option }, { token: session.token as string }));
  if (result) submitted.value = true;
}
</script>

<template>
  <FullscreenLayout>
    <h1>{{ t("seance.title") }}</h1>
    <PlaceholderVisual :caption="t('seance.imageCaption')" />
    <p>{{ t("seance.description") }}</p>
    <section class="panel pixel-frame">
      <ul class="option-list">
        <li
          v-for="option in NARRATION_OPTIONS"
          :key="option"
        >
          <button
            type="button"
            :disabled="pending || submitted"
            @click="cast(option)"
          >
            {{ t(`seance.options.${option}`) }}
          </button>
        </li>
      </ul>
      <p v-if="submitted">
        {{ t("seance.voteCast", { option: selected ? t(`seance.options.${selected}`) : "" }) }}
      </p>
    </section>
  </FullscreenLayout>
</template>

<style scoped>
.panel {
  margin-top: var(--nbr-space-3);
  padding: var(--nbr-space-3);
}

.option-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-2);
}
</style>
