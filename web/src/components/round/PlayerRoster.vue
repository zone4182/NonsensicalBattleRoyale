<script setup lang="ts">
import { useGameStore } from "../../stores/game";

const game = useGameStore();
</script>

<template>
  <div class="player-roster">
    <h2>Roster</h2>
    <ul v-if="game.players.length">
      <li
        v-for="player in game.players"
        :key="player.id"
      >
        {{ player.displayName }} -- {{ player.status }}
      </li>
    </ul>
    <p v-else>
      No players loaded yet.
    </p>
  </div>
</template>
