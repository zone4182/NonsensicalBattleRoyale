<script setup lang="ts">
import { ref } from "vue";
import { useSessionStore } from "../stores/session";
import { useApiCall } from "../composables/useApiCall";
import { callFunction } from "../lib/api";
import FullscreenLayout from "../layouts/FullscreenLayout.vue";

// No endpoint yet describes the real per-round narration options -- this is a fixed
// placeholder list. Future milestone scope: server-driven per-round option sets.
const NARRATION_OPTIONS = ["Somber", "Theatrical", "Mysterious", "Blunt"];

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
    <h1>The Seance</h1>
    <p>
      Vote among alternate narration flavors for this round's already-decided elimination announcement. Entirely
      cosmetic.
    </p>
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
            {{ option }}
          </button>
        </li>
      </ul>
      <p v-if="submitted">
        Vote cast: {{ selected }}.
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
