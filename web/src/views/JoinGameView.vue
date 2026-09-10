<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSessionStore } from "../stores/session";
import { callFunction, ApiCallError } from "../lib/api";
import FullscreenLayout from "../layouts/FullscreenLayout.vue";

interface RedeemResponse {
  player_id: string;
  role: "player" | "gm";
  game_id: string;
  game_phase: string;
  display_name: string;
}

const route = useRoute();
const router = useRouter();
const session = useSessionStore();

const token = ref(typeof route.params.token === "string" ? route.params.token : "");
const pending = ref(false);
const errorMessage = ref<string | null>(null);

async function redeem() {
  if (!token.value.trim()) return;
  pending.value = true;
  errorMessage.value = null;
  try {
    const res = await callFunction<RedeemResponse>("redeem-invite", { token: token.value.trim() });
    session.setSession({
      token: token.value.trim(),
      role: res.role,
      playerId: res.player_id,
      gameId: res.game_id,
      displayName: res.display_name,
    });
    router.push(res.role === "gm" ? { name: "gm-setup" } : { name: "arrival-prologue" });
  } catch (err) {
    if (err instanceof ApiCallError) {
      const messages: Record<string, string> = {
        invite_not_found: "No invite exists for this token.",
        already_redeemed: "This invite has already been redeemed.",
      };
      errorMessage.value = messages[err.code] ?? err.message;
    } else {
      errorMessage.value = "Something went wrong.";
    }
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <FullscreenLayout>
    <h1>You've been invited</h1>
    <p>Enter your personal invite token to arrive at the house.</p>
    <section class="panel pixel-frame">
      <form
        class="redeem-form"
        @submit.prevent="redeem"
      >
        <input
          v-model="token"
          type="text"
          placeholder="invite token"
          :disabled="pending"
        >
        <button
          type="submit"
          :disabled="pending || !token.trim()"
        >
          {{ pending ? "Redeeming..." : "Redeem invite" }}
        </button>
      </form>
      <p
        v-if="errorMessage"
        class="error"
      >
        {{ errorMessage }}
      </p>
    </section>
    <p class="back-link">
      <RouterLink :to="{ name: 'home' }">
        ← back
      </RouterLink>
    </p>
  </FullscreenLayout>
</template>

<style scoped>
.panel {
  margin-top: var(--nbr-space-3);
  padding: var(--nbr-space-3);
}

.redeem-form {
  display: flex;
  gap: var(--nbr-space-2);
}

.redeem-form input {
  flex: 1;
  background: var(--nbr-bg-raised);
  color: var(--nbr-fg);
  border: 1px solid var(--nbr-border);
  padding: var(--nbr-space-2);
  font-family: inherit;
}

.error {
  color: var(--nbr-danger);
}

.back-link {
  margin-top: var(--nbr-space-3);
}
</style>
