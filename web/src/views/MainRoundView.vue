<script setup lang="ts">
import { onMounted } from "vue";
import RoundHeader from "../components/round/RoundHeader.vue";
import CinematicViewport from "../components/round/CinematicViewport.vue";
import PlayerRoster from "../components/round/PlayerRoster.vue";
import YourStatusPanel from "../components/round/YourStatusPanel.vue";
import NarrationLog from "../components/round/NarrationLog.vue";
import VoteActionPanel from "../components/round/VoteActionPanel.vue";
import { useGameStore } from "../stores/game";
import { useSessionStore } from "../stores/session";
import { useApiCall } from "../composables/useApiCall";

const game = useGameStore();
const session = useSessionStore();
const { pending, run } = useApiCall();

onMounted(() => {
  if (session.token) run(() => game.refresh(session.token as string));
});
</script>

<template>
  <section class="screen round-layout">
    <div class="area-header">
      <RoundHeader />
    </div>
    <div class="area-viewport">
      <CinematicViewport />
    </div>
    <div class="area-roster">
      <PlayerRoster />
    </div>
    <div class="area-status">
      <YourStatusPanel />
    </div>
    <div class="area-narration">
      <NarrationLog />
    </div>
    <div class="area-action">
      <VoteActionPanel />
      <p
        v-if="pending"
        class="loading"
      >
        Loading...
      </p>
    </div>
  </section>
</template>

<style scoped>
/*
 * Grid-area based so the two open design questions (whether a cinematic moment
 * replaces vs. sits above the narration log; whether this is desktop-primary with a
 * mobile variant, or mobile-first) can be resolved later by changing
 * grid-template-areas/grid-template-columns without touching component internals.
 */
.round-layout {
  display: grid;
  grid-template-areas:
    "header header"
    "viewport roster"
    "viewport status"
    "narration action";
  grid-template-columns: 2fr 1fr;
  grid-template-rows: auto auto auto 1fr;
  gap: var(--nbr-space-3);
  height: 100%;
}

.area-header {
  grid-area: header;
}
.area-viewport {
  grid-area: viewport;
}
.area-roster {
  grid-area: roster;
}
.area-status {
  grid-area: status;
}
.area-narration {
  grid-area: narration;
  min-height: 0;
}
.area-action {
  grid-area: action;
}
</style>
