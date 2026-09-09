<script setup lang="ts">
import { computed } from "vue";
import { useGameStore } from "../../stores/game";

const game = useGameStore();

const host = computed(() => game.players.find((p) => p.role === "gm") ?? null);
const guests = computed(() => game.players.filter((p) => p.role === "player" && p.status === "alive"));
const dead = computed(() => game.players.filter((p) => p.role === "player" && p.status === "ghost"));
</script>

<template>
  <div class="player-roster">
    <h2>Roster</h2>
    <p v-if="!game.players.length">
      No players loaded yet.
    </p>
    <template v-else>
      <section class="roster-group">
        <h3>Host</h3>
        <p v-if="!host">
          No Game Master.
        </p>
        <ul v-else>
          <li>{{ host.displayName }}</li>
        </ul>
      </section>
      <section class="roster-group">
        <h3>Guests ({{ guests.length }})</h3>
        <p v-if="!guests.length">
          No one left standing.
        </p>
        <ul v-else>
          <li
            v-for="player in guests"
            :key="player.id"
          >
            {{ player.displayName }}
          </li>
        </ul>
      </section>
      <section class="roster-group">
        <h3>Dead ({{ dead.length }})</h3>
        <ul v-if="dead.length">
          <li
            v-for="player in dead"
            :key="player.id"
          >
            {{ player.displayName }}
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
</style>
