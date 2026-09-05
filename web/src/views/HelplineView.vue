<script setup lang="ts">
import { ref } from "vue";
import { useSessionStore } from "../stores/session";
import { useApiCall } from "../composables/useApiCall";
import { callFunction } from "../lib/api";
import FullscreenLayout from "../layouts/FullscreenLayout.vue";

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
    <h1>Helpline</h1>
    <p>Send a private question to the Game Master. Never player-to-player.</p>
    <form
      class="helpline-form"
      @submit.prevent="send"
    >
      <textarea
        v-model="body"
        rows="4"
        placeholder="Your question..."
        :disabled="pending"
      />
      <button
        type="submit"
        :disabled="pending || !body.trim()"
      >
        {{ pending ? "Sending..." : "Send" }}
      </button>
    </form>
    <p v-if="sent">
      Sent to the GM.
    </p>
  </FullscreenLayout>
</template>

<style scoped>
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
