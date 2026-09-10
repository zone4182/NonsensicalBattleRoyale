<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useSessionStore } from "../../stores/session";
import { useGameStore } from "../../stores/game";
import { callFunction, ApiCallError } from "../../lib/api";

interface InviteRow {
  id: string;
  display_name: string;
  role: "player" | "gm";
  redeemed_at: string | null;
}

interface CreateInviteResponse {
  invite_id: string;
  token: string;
  display_name: string;
}

const session = useSessionStore();
const game = useGameStore();

const invites = ref<InviteRow[]>([]);
// Tokens are only ever shown once, at creation -- list-invites deliberately never
// re-exposes them, so this locally-cached map is the only place a copy link exists
// after the fact (lost on reload, matching create-game's "shown once" precedent).
const tokensByInviteId = ref<Record<string, string>>({});

const displayName = ref("");
const pending = ref(false);
const errorMessage = ref<string | null>(null);

const canCreateInvite = computed(() => game.phase === "setup");

onMounted(() => {
  if (session.token) {
    game.refresh(session.token);
    loadInvites();
  }
});

async function loadInvites() {
  if (!session.token) return;
  const res = await callFunction<{ invites: InviteRow[] }>("list-invites", {}, { token: session.token });
  invites.value = res.invites;
}

async function createInvite() {
  if (!session.token || !displayName.value.trim()) return;
  pending.value = true;
  errorMessage.value = null;
  try {
    const res = await callFunction<CreateInviteResponse>(
      "create-invite",
      { display_name: displayName.value.trim() },
      { token: session.token },
    );
    tokensByInviteId.value[res.invite_id] = res.token;
    displayName.value = "";
    await loadInvites();
  } catch (err) {
    errorMessage.value = err instanceof ApiCallError ? err.message : "Something went wrong.";
  } finally {
    pending.value = false;
  }
}

function inviteLink(token: string): string {
  return `${window.location.origin}/invite/${token}`;
}

async function copyLink(token: string) {
  await navigator.clipboard.writeText(inviteLink(token));
}
</script>

<template>
  <div>
    <h1>GM: Invites</h1>
    <p>Create a player invite, then copy the link and send it yourself -- there's no in-app sending.</p>

    <!--
      Mobile: stacked (create panel above list panel). Tablet and up (>=721px, same
      threshold as MainRoundView's tiers): side by side -- both panels are short
      enough that a 2-column layout doesn't need a separate desktop-only tier here.
    -->
    <div class="invites-layout">
      <section class="panel-create pixel-frame">
        <h2>Create invite</h2>
        <form
          class="invite-form"
          @submit.prevent="createInvite"
        >
          <input
            v-model="displayName"
            type="text"
            placeholder="player display name"
            :disabled="!canCreateInvite || pending"
          >
          <button
            type="submit"
            :disabled="!canCreateInvite || pending || !displayName.trim()"
          >
            {{ pending ? "Creating..." : "Create invite" }}
          </button>
        </form>
        <p v-if="!canCreateInvite">
          Invites can only be created while the game is in setup.
        </p>
        <p
          v-if="errorMessage"
          class="error"
        >
          {{ errorMessage }}
        </p>
      </section>

      <section class="panel-list pixel-frame">
        <h2>Invites ({{ invites.length }})</h2>
        <p v-if="!invites.length">
          No invites created yet.
        </p>
        <ul
          v-else
          class="invite-list"
        >
          <li
            v-for="invite in invites"
            :key="invite.id"
          >
            {{ invite.display_name }} ({{ invite.role }}) --
            <span v-if="invite.redeemed_at">Redeemed</span>
            <span v-else>Pending</span>
            <button
              v-if="!invite.redeemed_at && tokensByInviteId[invite.id]"
              type="button"
              @click="copyLink(tokensByInviteId[invite.id])"
            >
              Copy link
            </button>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.invites-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--nbr-space-3);
  margin-top: var(--nbr-space-3);
}

@media (min-width: 721px) {
  .invites-layout {
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
}

.panel-create,
.panel-list {
  padding: var(--nbr-space-3);
}

.invite-form {
  display: flex;
  gap: var(--nbr-space-2);
}

.invite-form input {
  flex: 1;
  background: var(--nbr-bg-raised);
  color: var(--nbr-fg);
  border: 1px solid var(--nbr-border);
  padding: var(--nbr-space-2);
  font-family: inherit;
}

.invite-list {
  list-style: none;
  padding: 0;
  margin-top: var(--nbr-space-3);
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-2);
}

.error {
  color: var(--nbr-danger);
}
</style>
