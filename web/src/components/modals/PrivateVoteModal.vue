<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useGameStore } from "../../stores/game";
import { useSessionStore } from "../../stores/session";
import { callFunction, ApiCallError } from "../../lib/api";

// Deliberately its own route (not a v-if inside MainRoundView): votes must stay
// anonymous even in the UI's own visual language, so this must never share a DOM tree
// with the public roster panel. See GAME-DESIGN.md §UI Layout.
const router = useRouter();
const game = useGameStore();
const session = useSessionStore();

const selectedId = ref<string | null>(null);
const pending = ref(false);
const errorMessage = ref<string | null>(null);

const VOTE_ERROR_MESSAGES: Record<string, string> = {
  no_open_round: "There's no open round to vote in right now.",
  invalid_target: "That player can't be voted for.",
  vote_entitlement_exhausted: "You've already cast all your votes this round.",
};

onMounted(() => {
  if (game.players.length === 0 && session.token) {
    game.refresh(session.token);
  }
});

async function confirmVote() {
  const token = session.token;
  if (!selectedId.value || !token) return;
  pending.value = true;
  errorMessage.value = null;
  try {
    await callFunction("submit-vote", { target_player_id: selectedId.value }, { token });
    await game.refresh(token);
    router.push({ name: "main-round" });
  } catch (err) {
    errorMessage.value = err instanceof ApiCallError ? (VOTE_ERROR_MESSAGES[err.code] ?? err.message) : "Something went wrong.";
  } finally {
    pending.value = false;
  }
}

function close() {
  router.push({ name: "main-round" });
}
</script>

<template>
  <section class="screen private-vote-modal">
    <h1>Cast your vote</h1>
    <p>Private and anonymous -- no attribution, ever, until the end-of-game reveal.</p>
    <ul
      v-if="game.players.length"
      class="candidate-list"
    >
      <li
        v-for="player in game.players"
        :key="player.id"
      >
        <label>
          <input
            type="radio"
            name="vote-target"
            :value="player.id"
            :checked="selectedId === player.id"
            :disabled="player.status !== 'alive'"
            @change="selectedId = player.id"
          >
          {{ player.displayName }}
          <span v-if="player.status !== 'alive'">(ghost)</span>
        </label>
      </li>
    </ul>
    <p v-else>
      No player roster loaded yet.
    </p>
    <p
      v-if="errorMessage"
      class="error"
    >
      {{ errorMessage }}
    </p>
    <div class="actions">
      <button
        type="button"
        :disabled="!selectedId || pending"
        @click="confirmVote"
      >
        {{ pending ? "Casting..." : "Confirm vote" }}
      </button>
      <button
        type="button"
        @click="close"
      >
        Close
      </button>
    </div>
  </section>
</template>

<style scoped>
.candidate-list {
  list-style: none;
  padding: 0;
}

.error {
  color: var(--nbr-danger);
}

.actions {
  display: flex;
  gap: var(--nbr-space-2);
}
</style>
