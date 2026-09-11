<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useSessionStore } from "../stores/session";
import { useApiCall } from "../composables/useApiCall";
import { usePoll } from "../composables/usePoll";
import { callFunction } from "../lib/api";
import FullscreenLayout from "../layouts/FullscreenLayout.vue";

const POLL_INTERVAL_MS = 15_000;

interface HelplineMessageRow {
  id: string;
  player_id: string;
  player_display_name: string;
  sender_role: "player" | "gm";
  body: string;
  in_reply_to: string | null;
  created_at: string;
}

interface Thread {
  question: HelplineMessageRow;
  reply: HelplineMessageRow | null;
}

const { t } = useI18n();
const session = useSessionStore();
const { pending, run } = useApiCall();
const body = ref("");
const messages = ref<HelplineMessageRow[]>([]);

async function loadMessages() {
  if (!session.token) return;
  const res = await callFunction<{ messages: HelplineMessageRow[] }>(
    "list-helpline-messages",
    {},
    { token: session.token },
  );
  messages.value = res.messages;
}

onMounted(loadMessages);
usePoll(loadMessages, POLL_INTERVAL_MS);

// Newest question first -- a returning player cares most about whether their latest
// question has been answered yet, not about scrolling past old resolved ones.
const threads = computed<Thread[]>(() => {
  const replies = new Map(
    messages.value.filter((m) => m.sender_role === "gm" && m.in_reply_to).map((m) => [m.in_reply_to as string, m]),
  );
  return messages.value
    .filter((m) => m.sender_role === "player" && !m.in_reply_to)
    .map((question) => ({ question, reply: replies.get(question.id) ?? null }))
    .reverse();
});

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

async function send() {
  if (!body.value.trim() || !session.token) return;
  const result = await run(() => callFunction("helpline-message", { body: body.value.trim() }, { token: session.token as string }));
  if (result) {
    body.value = "";
    await loadMessages();
  }
}
</script>

<template>
  <FullscreenLayout>
    <h1>{{ t("helpline.title") }}</h1>
    <p class="disclaimer">
      {{ t("helpline.disclaimer") }}
    </p>
    <section class="panel pixel-frame">
      <h2>{{ t("helpline.askNew") }}</h2>
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
    </section>

    <h2>{{ t("helpline.history") }}</h2>
    <p v-if="!threads.length">
      {{ t("helpline.noMessages") }}
    </p>
    <section
      v-for="thread in threads"
      :key="thread.question.id"
      class="thread pixel-frame"
    >
      <p class="message question">
        <strong>{{ t("helpline.you") }}:</strong> {{ thread.question.body }}
      </p>
      <p class="meta">
        {{ formatTime(thread.question.created_at) }}
      </p>
      <template v-if="thread.reply">
        <p class="message reply">
          <strong>{{ t("helpline.gm") }}:</strong> {{ thread.reply.body }}
        </p>
        <p class="meta">
          {{ formatTime(thread.reply.created_at) }}
        </p>
      </template>
      <p
        v-else
        class="awaiting"
      >
        {{ t("helpline.awaitingReply") }}
      </p>
    </section>

    <p class="back-link">
      <RouterLink :to="{ name: 'main-round' }">
        {{ t("common.back") }}
      </RouterLink>
    </p>
  </FullscreenLayout>
</template>

<style scoped>
.disclaimer {
  color: var(--nbr-muted);
  font-size: 0.9em;
}

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

.thread {
  padding: var(--nbr-space-3);
  margin-top: var(--nbr-space-3);
}

.message {
  margin: 0;
}

.reply {
  margin-top: var(--nbr-space-2);
  color: var(--nbr-accent);
}

.meta {
  margin: 0;
  color: var(--nbr-muted);
  font-size: 0.75em;
}

.awaiting {
  margin-top: var(--nbr-space-2);
  color: var(--nbr-muted);
  font-size: 0.85em;
}

.back-link {
  margin-top: var(--nbr-space-3);
}
</style>
