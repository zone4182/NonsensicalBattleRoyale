<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useSessionStore } from "../stores/session";
import { callFunction, ApiCallError } from "../lib/api";
import FullscreenLayout from "../layouts/FullscreenLayout.vue";

interface GameRevealResponse {
  rounds: {
    round_number: number;
    eliminated_player_display_name: string | null;
    tie_break_method: string | null;
    resolved_at: string;
    votes: {
      voter_display_name: string;
      target_display_name: string;
      target_vote_count: number;
      is_double_vote: boolean;
      reason: string | null;
      cast_at: string;
    }[];
  }[];
  door_picks: {
    player_display_name: string;
    door_number: number;
    resolved_outcome: "win" | "lose" | "lose_all" | null;
    picked_at: string;
  }[];
}

const { t } = useI18n();
const router = useRouter();
const session = useSessionStore();

const reveal = ref<GameRevealResponse | null>(null);
const errorMessage = ref<string | null>(null);

const REVEAL_ERROR_MESSAGES: Record<string, string> = {
  game_not_ended: t("gameStats.errors.gameNotEnded"),
};

onMounted(async () => {
  if (!session.token) return;
  try {
    reveal.value = await callFunction<GameRevealResponse>("get-game-reveal", {}, { token: session.token });
  } catch (err) {
    errorMessage.value = err instanceof ApiCallError ? (REVEAL_ERROR_MESSAGES[err.code] ?? err.message) : t("common.somethingWentWrong");
  }
});

function close() {
  router.push({ name: "end-game-reveal" });
}
</script>

<template>
  <FullscreenLayout>
    <h1>{{ t("gameStats.title") }}</h1>
    <p class="field-hint">
      {{ t("gameStats.hint") }}
    </p>

    <p
      v-if="errorMessage"
      class="error"
    >
      {{ errorMessage }}
    </p>
    <p v-else-if="!reveal">
      {{ t("common.loading") }}
    </p>

    <template v-else>
      <p v-if="reveal.rounds.length === 0">
        {{ t("gameStats.noRounds") }}
      </p>
      <section
        v-for="round in reveal.rounds"
        :key="round.round_number"
        class="round-block pixel-frame"
      >
        <h2>{{ t("gameStats.round", { number: round.round_number }) }}</h2>
        <p>
          {{ t("gameStats.eliminated", { name: round.eliminated_player_display_name ?? t("gameStats.noOne") }) }}
          <span v-if="round.tie_break_method === 'random'">{{ t("gameStats.randomTieBreak") }}</span>
          <span v-else-if="round.tie_break_method === 'no_elimination'">{{ t("gameStats.noEliminationTieBreak") }}</span>
        </p>
        <div class="table-scroll">
          <table class="votes-table">
            <thead>
              <tr>
                <th>{{ t("gameStats.voter") }}</th>
                <th>{{ t("gameStats.target") }}</th>
                <th>{{ t("gameStats.votesReceived") }}</th>
                <th>{{ t("gameStats.doubleVote") }}</th>
                <th>{{ t("gameStats.reason") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(vote, i) in round.votes"
                :key="i"
                :class="{ 'eliminated-row': vote.target_display_name === round.eliminated_player_display_name }"
              >
                <td>{{ vote.voter_display_name }}</td>
                <td>{{ vote.target_display_name }}</td>
                <td>{{ vote.target_vote_count }}</td>
                <td>{{ vote.is_double_vote ? t("gameStats.yes") : "" }}</td>
                <td>{{ vote.reason ?? "" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <template v-if="reveal.door_picks.length > 0">
        <h2>{{ t("gameStats.threeDoorsHeading") }}</h2>
        <div class="table-scroll">
          <table class="votes-table">
            <thead>
              <tr>
                <th>{{ t("gameStats.player") }}</th>
                <th>{{ t("gameStats.door") }}</th>
                <th>{{ t("gameStats.outcome") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="pick in reveal.door_picks"
                :key="pick.player_display_name"
              >
                <td>{{ pick.player_display_name }}</td>
                <td>{{ pick.door_number }}</td>
                <td>{{ pick.resolved_outcome ?? t("gameStats.pending") }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>

    <button
      type="button"
      class="close-button"
      @click="close"
    >
      {{ t("common.close") }}
    </button>
  </FullscreenLayout>
</template>

<style scoped>
.field-hint {
  color: var(--nbr-muted);
  font-size: 0.85em;
}

.error {
  color: var(--nbr-danger);
}

.round-block {
  padding: var(--nbr-space-3);
  margin-bottom: var(--nbr-space-3);
}

.table-scroll {
  overflow-x: auto;
  margin-bottom: var(--nbr-space-2);
}

.votes-table {
  border-collapse: collapse;
}

.votes-table th,
.votes-table td {
  border: 1px solid var(--nbr-border);
  padding: var(--nbr-space-1) var(--nbr-space-2);
  text-align: left;
}

.votes-table th {
  color: var(--nbr-accent);
}

.eliminated-row {
  background: color-mix(in srgb, var(--nbr-danger) 20%, transparent);
}

.eliminated-row td {
  color: var(--nbr-danger);
}

.close-button {
  margin-top: var(--nbr-space-3);
  width: 100%;
}
</style>
