<script setup lang="ts">
import { ref } from "vue";
import { useSessionStore } from "../../stores/session";
import { callFunction, ApiCallError } from "../../lib/api";

const props = defineProps<{
  powerKey: string;
  category: string;
  count: number;
}>();

const ARM_FOR_ROUND_POWERS = new Set(["ward", "deflect", "null"]);
const ASK_POWERS = new Set(["whisper", "watcher"]);
const IN_SCOPE_POWERS = new Set(["rewind", "whisper", "watcher", "ward", "deflect", "null"]);

const session = useSessionStore();
const pending = ref(false);
const message = ref<string | null>(null);
const roundNumber = ref<number | null>(null);

interface UsePowerResponse {
  status: string;
  round_number?: number;
  tally?: { target_player_id: string; vote_count: number }[];
  were_you_top_target?: boolean;
  double_vote_player_id?: string | null;
}

async function use() {
  if (!session.token) return;
  pending.value = true;
  message.value = null;
  try {
    const body: Record<string, unknown> = { power_key: props.powerKey };
    if (props.powerKey === "rewind" && roundNumber.value) body.round_number = roundNumber.value;

    const res = await callFunction<UsePowerResponse>("use-power", body, { token: session.token });

    if (props.powerKey === "whisper") {
      message.value = res.were_you_top_target ? "Yes -- you were the top target last round." : "No.";
    } else if (props.powerKey === "watcher") {
      message.value = res.double_vote_player_id
        ? `Double vote holder: ${res.double_vote_player_id}`
        : "No one holds the double vote right now.";
    } else if (props.powerKey === "rewind") {
      const lines = (res.tally ?? []).map((t) => `${t.target_player_id}: ${t.vote_count}`).join(", ") || "No votes cast.";
      message.value = lines;
    } else {
      message.value = `Armed for round ${res.round_number}.`;
    }
  } catch (err) {
    message.value = err instanceof ApiCallError ? err.message : "Something went wrong.";
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <div class="power-use">
    <span class="power-name">{{ powerKey }}<template v-if="count > 1"> x{{ count }}</template></span>

    <template v-if="!IN_SCOPE_POWERS.has(powerKey)">
      <span class="not-implemented">Not usable yet</span>
    </template>
    <template v-else-if="ARM_FOR_ROUND_POWERS.has(powerKey)">
      <button
        type="button"
        :disabled="pending"
        @click="use"
      >
        {{ pending ? "Arming..." : "Arm for this round" }}
      </button>
    </template>
    <template v-else-if="ASK_POWERS.has(powerKey)">
      <button
        type="button"
        :disabled="pending"
        @click="use"
      >
        {{ pending ? "Asking..." : "Ask" }}
      </button>
    </template>
    <template v-else-if="powerKey === 'rewind'">
      <input
        v-model.number="roundNumber"
        type="number"
        min="1"
        placeholder="round #"
      >
      <button
        type="button"
        :disabled="pending || !roundNumber"
        @click="use"
      >
        {{ pending ? "Viewing..." : "View" }}
      </button>
    </template>

    <p
      v-if="message"
      class="power-message"
    >
      {{ message }}
    </p>
  </div>
</template>

<style scoped>
.power-use {
  display: flex;
  align-items: center;
  gap: var(--nbr-space-2);
  flex-wrap: wrap;
}

.power-name {
  font-weight: bold;
}

.not-implemented {
  color: var(--nbr-muted);
}

.power-use input {
  width: 5rem;
  background: var(--nbr-bg-raised);
  color: var(--nbr-fg);
  border: 1px solid var(--nbr-border);
  padding: var(--nbr-space-1);
  font-family: inherit;
}

.power-message {
  width: 100%;
  margin: 0;
  color: var(--nbr-muted);
}
</style>
