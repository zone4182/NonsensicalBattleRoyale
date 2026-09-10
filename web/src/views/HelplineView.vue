<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useSessionStore } from "../stores/session";
import { useApiCall } from "../composables/useApiCall";
import { callFunction } from "../lib/api";
import FullscreenLayout from "../layouts/FullscreenLayout.vue";

const { t } = useI18n();

// Send-only this milestone: no read/list endpoint exists yet for helpline threads
// (out of scope -- only get-game-state was approved as a new read path), so past
// messages aren't displayed here.
const session = useSessionStore();
const { pending, run } = useApiCall();
const body = ref("");
const sent = ref(false);

async function send() {
  if (!body.value.trim() || !session.token) return;
  const result = await run(() => callFunction("helpline-message", { body: body.value.trim() }, { token: session.token as string }));
  if (result) {
    sent.value = true;
    body.value = "";
  }
}
</script>

<template>
  <FullscreenLayout>
    <h1>{{ t("helpline.title") }}</h1>
    <p>{{ t("helpline.description") }}</p>
    <section class="panel pixel-frame">
      <form
        class="helpline-form"
        @submit.prevent="send"
      >
        <textarea
          v-model="body"
          rows="4"
          :placeholder="t('helpline.bodyPlaceholder')"
          :disabled="pending"
        />
        <button
          type="submit"
          :disabled="pending || !body.trim()"
        >
          {{ pending ? t("helpline.sending") : t("helpline.send") }}
        </button>
      </form>
      <p v-if="sent">
        {{ t("helpline.sent") }}
      </p>
    </section>
  </FullscreenLayout>
</template>

<style scoped>
.panel {
  margin-top: var(--nbr-space-3);
  padding: var(--nbr-space-3);
}

.helpline-form {
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-2);
}

.helpline-form textarea {
  background: var(--nbr-bg-raised);
  color: var(--nbr-fg);
  border: 1px solid var(--nbr-border);
  padding: var(--nbr-space-2);
  font-family: inherit;
}
</style>
