<script setup lang="ts">
import { ref } from "vue";
import { useSessionStore } from "../../stores/session";
import { useApiCall } from "../../composables/useApiCall";
import { callFunction } from "../../lib/api";

const session = useSessionStore();
const { pending, run } = useApiCall();
const inReplyTo = ref("");
const body = ref("");
const sent = ref(false);

async function reply() {
  if (!inReplyTo.value.trim() || !body.value.trim() || !session.token) return;
  const result = await run(() =>
    callFunction(
      "helpline-message",
      { body: body.value.trim(), in_reply_to: inReplyTo.value.trim() },
      { token: session.token as string },
    ),
  );
  if (result) {
    sent.value = true;
    body.value = "";
  }
}
</script>

<template>
  <div>
    <h1>GM: Helpline Inbox</h1>
    <p>
      No helpline-read endpoint exists yet this milestone -- the original message id must be obtained out-of-band
      (e.g. via psql) until a future milestone adds a thread-list endpoint.
    </p>
    <form
      class="reply-form"
      @submit.prevent="reply"
    >
      <input
        v-model="inReplyTo"
        type="text"
        placeholder="original message id (uuid)"
        :disabled="pending"
      >
      <textarea
        v-model="body"
        rows="4"
        placeholder="Your reply..."
        :disabled="pending"
      />
      <button
        type="submit"
        :disabled="pending || !inReplyTo.trim() || !body.trim()"
      >
        {{ pending ? "Sending..." : "Send reply" }}
      </button>
    </form>
    <p v-if="sent">
      Reply sent.
    </p>
  </div>
</template>

<style scoped>
.reply-form {
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-2);
  max-width: 480px;
}

.reply-form input,
.reply-form textarea {
  background: var(--nbr-bg-raised);
  color: var(--nbr-fg);
  border: 1px solid var(--nbr-border);
  padding: var(--nbr-space-2);
  font-family: inherit;
}
</style>
