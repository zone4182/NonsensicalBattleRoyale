<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import RoundHeader from "../components/round/RoundHeader.vue";
import CinematicViewport from "../components/round/CinematicViewport.vue";
import PlayerRoster from "../components/round/PlayerRoster.vue";
import YourStatusPanel from "../components/round/YourStatusPanel.vue";
import NarrationLog from "../components/round/NarrationLog.vue";
import VoteActionPanel from "../components/round/VoteActionPanel.vue";
import { useGameStore } from "../stores/game";
import { useSessionStore } from "../stores/session";
import { useApiCall } from "../composables/useApiCall";
import { usePoll } from "../composables/usePoll";

// 15s keeps a fast-round game feeling responsive without hammering get-game-state; a
// background poll never shows the loading spinner (only the initial mount fetch does,
// via `run`).
const POLL_INTERVAL_MS = 15_000;

const router = useRouter();
const game = useGameStore();
const session = useSessionStore();
const { pending, run } = useApiCall();

onMounted(() => {
  if (session.token) run(() => game.refresh(session.token as string));
});

usePoll(() => {
  if (session.token) game.refresh(session.token);
}, POLL_INTERVAL_MS);

// Nothing else in the app currently reacts to a phase change at all -- without this, a
// player sits on this screen forever once the game moves past 'active', even though the
// poll above is quietly fetching the new phase the whole time.
watch(
  () => game.phase,
  (phase) => {
    if (phase === "ended") {
      router.push({ name: "end-game-reveal" });
    } else if (phase === "three_doors" && game.yourStatus?.status === "alive") {
      router.push({ name: "three-doors" });
    }
  },
);
</script>

<template>
  <section class="screen round-layout">
    <div class="area-header">
      <RoundHeader />
    </div>
    <div class="area-viewport pixel-frame">
      <CinematicViewport />
    </div>
    <div class="area-hub pixel-frame">
      <PlayerRoster />
      <YourStatusPanel />
    </div>
    <div class="area-narration pixel-frame">
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
    "viewport hub"
    "viewport hub"
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
  padding: var(--nbr-space-3);
}
.area-hub {
  grid-area: hub;
  padding: var(--nbr-space-3);
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-3);
  overflow-y: auto;
}
.area-narration {
  grid-area: narration;
  min-height: 0;
  padding: var(--nbr-space-3);
}
.area-action {
  grid-area: action;
}
</style>
