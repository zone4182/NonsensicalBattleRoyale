<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useGameStore } from "../../stores/game";
import { useSessionStore } from "../../stores/session";

const { t } = useI18n();
const game = useGameStore();
const session = useSessionStore();

const host = computed(() => game.players.find((p) => p.role === "gm") ?? null);
const guests = computed(() => game.players.filter((p) => p.role === "player" && p.status === "alive"));
const dead = computed(() => game.players.filter((p) => p.role === "player" && p.status === "ghost"));

// game.yourStatus.activeVotes only ever holds the viewing player's own vote(s) --
// get-game-state never returns another player's target (see getActiveVoteTargetsForVoter
// in db.ts) -- so this marker is inherently private to whoever's looking at their own
// roster, with no extra visibility check needed here.
const votedForIds = computed(() => new Set((game.yourStatus?.activeVotes ?? []).map((v) => v.targetPlayerId)));

// game.yourStatus.isDoubleVoteHolder is scoped the exact same way -- get-game-state
// never tells anyone else's whether THEY hold the double vote, only the caller's own
// (see get-game-state/index.ts). Comparing to session.playerId just picks out which
// roster row is "me" to hang the badge on; it isn't itself the privacy boundary.
const isDoubleVoteHolder = computed(() => game.yourStatus?.isDoubleVoteHolder ?? false);
</script>

<template>
  <div class="player-roster">
    <h2>{{ t("playerRoster.title") }}</h2>
    <p v-if="!game.players.length">
      {{ t("playerRoster.noPlayers") }}
    </p>
    <template v-else>
      <section class="roster-group">
        <h3>{{ t("playerRoster.host") }}</h3>
        <p v-if="!host">
          {{ t("playerRoster.noGm") }}
        </p>
        <ul v-else>
          <li>{{ host.displayName }}</li>
        </ul>
      </section>
      <section class="roster-group">
        <h3>{{ t("playerRoster.guests", { count: guests.length }) }}</h3>
        <p v-if="!guests.length">
          {{ t("playerRoster.noneStanding") }}
        </p>
        <ul v-else>
          <li
            v-for="player in guests"
            :key="player.id"
          >
            {{ player.displayName }}
            <span
              v-if="player.isBot"
              class="bot-badge"
              :title="t('playerRoster.botBadgeTitle')"
            >{{ t("playerRoster.botBadge") }}</span>
            <span
              v-if="votedForIds.has(player.id)"
              class="voted-badge"
              :title="t('playerRoster.votedBadgeTitle')"
            >{{ t("playerRoster.votedBadge") }}</span>
            <span
              v-if="player.id === session.playerId && isDoubleVoteHolder"
              class="double-vote-badge"
              :title="t('playerRoster.doubleVoteBadgeTitle')"
            >{{ t("playerRoster.doubleVoteBadge") }}</span>
          </li>
        </ul>
      </section>
      <section class="roster-group">
        <h3>{{ t("playerRoster.dead", { count: dead.length }) }}</h3>
        <ul v-if="dead.length">
          <li
            v-for="player in dead"
            :key="player.id"
          >
            {{ player.displayName }}
            <span
              v-if="player.isBot"
              class="bot-badge"
              :title="t('playerRoster.botBadgeTitle')"
            >{{ t("playerRoster.botBadge") }}</span>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<style scoped>
.roster-group {
  margin-bottom: var(--nbr-space-3);
}

.roster-group h3 {
  color: var(--nbr-muted);
  font-size: 0.9em;
  margin-bottom: var(--nbr-space-1);
}

.roster-group ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.bot-badge {
  display: inline-block;
  margin-left: var(--nbr-space-1);
  padding: 0 4px;
  font-size: 0.7em;
  line-height: 1.4;
  color: var(--nbr-accent);
  border: 1px solid var(--nbr-accent);
  vertical-align: middle;
}

.voted-badge {
  display: inline-block;
  margin-left: var(--nbr-space-1);
  padding: 0 4px;
  font-size: 0.7em;
  line-height: 1.4;
  color: var(--nbr-bg);
  background: var(--nbr-accent);
  vertical-align: middle;
}

.double-vote-badge {
  display: inline-block;
  margin-left: var(--nbr-space-1);
  padding: 0 4px;
  font-size: 0.7em;
  line-height: 1.4;
  color: var(--nbr-danger);
  border: 1px solid var(--nbr-danger);
  vertical-align: middle;
}
</style>
