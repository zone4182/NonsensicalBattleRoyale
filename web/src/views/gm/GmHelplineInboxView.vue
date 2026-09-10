<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useSessionStore } from "../../stores/session";
import { usePoll } from "../../composables/usePoll";
import { callFunction, ApiCallError } from "../../lib/api";

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
const messages = ref<HelplineMessageRow[]>([]);
const selectedPlayerId = ref<string>("");

async function loadMessages() {
  if (!session.token) return;
  const res = await callFunction<{ messages: HelplineMessageRow[] }>(
    "list-helpline-messages",
    {},
    { token: session.token },
  );
  messages.value = res.messages;
  if (!selectedPlayerId.value && res.messages.length > 0) {
    selectedPlayerId.value = res.messages[0].player_id;
  }
}

onMounted(loadMessages);
usePoll(loadMessages, POLL_INTERVAL_MS);

// One entry per player who has ever written in, ordered by their most recent activity
// (whoever needs a reply soonest tends to be who last wrote something) -- not
// alphabetically, which would bury an active conversation under an idle one.
const players = computed(() => {
  const lastActivityById = new Map<string, { name: string; lastAt: string }>();
  for (const m of messages.value) {
    const existing = lastActivityById.get(m.player_id);
    if (!existing || m.created_at > existing.lastAt) {
      lastActivityById.set(m.player_id, { name: m.player_display_name, lastAt: m.created_at });
    }
  }
  return Array.from(lastActivityById.entries())
    .map(([id, v]) => ({ id, name: v.name, lastAt: v.lastAt }))
    .sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
});

const threads = computed<Thread[]>(() => {
  if (!selectedPlayerId.value) return [];
  const forPlayer = messages.value.filter((m) => m.player_id === selectedPlayerId.value);
  const replies = new Map(
    forPlayer.filter((m) => m.sender_role === "gm" && m.in_reply_to).map((m) => [m.in_reply_to as string, m]),
  );
  return forPlayer
    .filter((m) => m.sender_role === "player" && !m.in_reply_to)
    .map((question) => ({ question, reply: replies.get(question.id) ?? null }))
    .reverse();
});

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const replyDrafts = ref<Record<string, string>>({});
const replyPending = ref<Record<string, boolean>>({});
const replyError = ref<Record<string, string>>({});

async function sendReply(questionId: string) {
  const draft = (replyDrafts.value[questionId] ?? "").trim();
  if (!draft || !session.token) return;
  replyPending.value = { ...replyPending.value, [questionId]: true };
  replyError.value = { ...replyError.value, [questionId]: "" };
  try {
    await callFunction("helpline-message", { body: draft, in_reply_to: questionId }, { token: session.token });
    replyDrafts.value = { ...replyDrafts.value, [questionId]: "" };
    await loadMessages();
  } catch (err) {
    replyError.value = {
      ...replyError.value,
      [questionId]: err instanceof ApiCallError ? err.message : t("common.somethingWentWrong"),
    };
  } finally {
    replyPending.value = { ...replyPending.value, [questionId]: false };
  }
}
</script>

<template>
  <div>
    <h1>{{ t("gmHelplineInbox.title") }}</h1>
    <p>{{ t("gmHelplineInbox.description") }}</p>

    <p v-if="!players.length">
      {{ t("gmHelplineInbox.noPlayers") }}
    </p>
    <template v-else>
      <label class="player-filter">
        {{ t("gmHelplineInbox.playerFilter") }}
        <select v-model="selectedPlayerId">
          <option
            v-for="p in players"
            :key="p.id"
            :value="p.id"
          >
            {{ p.name }}
          </option>
        </select>
      </label>

      <section
        v-for="thread in threads"
        :key="thread.question.id"
        class="thread pixel-frame"
      >
        <p class="message question">
          {{ thread.question.body }}
        </p>
        <p class="meta">
          {{ formatTime(thread.question.created_at) }}
        </p>

        <template v-if="thread.reply">
          <p class="message reply">
            <strong>{{ t("gmHelplineInbox.gmReplyLabel") }}:</strong> {{ thread.reply.body }}
          </p>
          <p class="meta">
            {{ formatTime(thread.reply.created_at) }}
          </p>
        </template>
        <form
          v-else
          class="reply-form"
          @submit.prevent="sendReply(thread.question.id)"
        >
          <textarea
            v-model="replyDrafts[thread.question.id]"
            rows="3"
            :placeholder="t('gmHelplineInbox.reply.bodyPlaceholder')"
            :disabled="replyPending[thread.question.id]"
          />
          <button
            type="submit"
            :disabled="replyPending[thread.question.id] || !(replyDrafts[thread.question.id] ?? '').trim()"
          >
            {{ replyPending[thread.question.id] ? t("gmHelplineInbox.reply.sending") : t("gmHelplineInbox.reply.send") }}
          </button>
          <p
            v-if="replyError[thread.question.id]"
            class="error"
          >
            {{ replyError[thread.question.id] }}
          </p>
        </form>
      </section>
    </template>
  </div>
</template>

<style scoped>
.player-filter {
  display: block;
  max-width: 320px;
  margin-top: var(--nbr-space-3);
}

.player-filter select {
  display: block;
  width: 100%;
  margin-top: var(--nbr-space-1);
  background: var(--nbr-bg-raised);
  color: var(--nbr-fg);
  border: 1px solid var(--nbr-border);
  padding: var(--nbr-space-2);
  font-family: inherit;
}

.thread {
  max-width: 480px;
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

.reply-form {
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-2);
  margin-top: var(--nbr-space-2);
}

.reply-form textarea {
  background: var(--nbr-bg-raised);
  color: var(--nbr-fg);
  border: 1px solid var(--nbr-border);
  padding: var(--nbr-space-2);
  font-family: inherit;
}

.error {
  color: var(--nbr-danger);
}
</style>
