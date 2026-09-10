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
    <!--
      Just one content block (no thread list yet -- see the note above), so unlike
      GmSetupView/GmInvitesView there's no second panel to split into a tablet
      2-column layout. A single framed panel with a sane max-width reads fine at
      every size.
    -->
    <section class="panel pixel-frame">
      <h2>Reply</h2>
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
    </section>
  </div>
</template>

<style scoped>
.panel {
  max-width: 480px;
  margin-top: var(--nbr-space-3);
  padding: var(--nbr-space-3);
}

.reply-form {
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-2);
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
