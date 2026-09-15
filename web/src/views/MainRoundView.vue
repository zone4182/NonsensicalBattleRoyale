<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import RoundHeader from "../components/round/RoundHeader.vue";
import HeaderMenu from "../components/round/HeaderMenu.vue";
import CinematicViewport from "../components/round/CinematicViewport.vue";
import PlayerRoster from "../components/round/PlayerRoster.vue";
import YourStatusPanel from "../components/round/YourStatusPanel.vue";
import NarrationLog from "../components/round/NarrationLog.vue";
import VoteActionPanel from "../components/round/VoteActionPanel.vue";
import PrologueDecisionPanel from "../components/round/PrologueDecisionPanel.vue";
import PrologueOutcomeGate from "../components/round/PrologueOutcomeGate.vue";
import PlayerSettingsModal from "../components/PlayerSettingsModal.vue";
import { useGameStore } from "../stores/game";
import { useSessionStore } from "../stores/session";
import { useUiStore } from "../stores/ui";
import { useApiCall } from "../composables/useApiCall";
import { usePoll } from "../composables/usePoll";
import { useGameFinishedRedirect } from "../composables/useGameFinishedRedirect";
import { hasSeenPrologueOutcome, markPrologueOutcomeSeen } from "../lib/prologueOutcomeSeen";

// 15s keeps a fast-round game feeling responsive without hammering get-game-state; a
// background poll never shows the loading spinner (only the initial mount fetch does,
// via `run`).
const POLL_INTERVAL_MS = 15_000;

const { t } = useI18n();
const router = useRouter();
const game = useGameStore();
const session = useSessionStore();
const ui = useUiStore();
const { pending, run } = useApiCall();
const showSettings = ref(false);

useGameFinishedRedirect();

// The one-time "letter in the study" transition beat between round 1 (the group's
// decision) and round 2 (the real first vote) -- see PrologueOutcomeGate.vue. Round 1
// has no eliminations, so there's no ghost/alive split to worry about here: everyone
// who reaches round 2 sees this exactly once.
const prologueGateDismissedThisSession = ref(false);
const showPrologueGate = computed(
  () =>
    game.currentRound?.roundNumber === 2 &&
    !prologueGateDismissedThisSession.value &&
    !hasSeenPrologueOutcome(game.gameId ?? ""),
);
function continuePastPrologueGate() {
  if (game.gameId) markPrologueOutcomeSeen(game.gameId);
  prologueGateDismissedThisSession.value = true;
}

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
  <section
    id="main-round-screen"
    class="screen round-layout"
  >
    <div
      id="round-header-panel"
      class="area-header"
    >
      <RoundHeader />
      <HeaderMenu @open-settings="showSettings = true" />
    </div>
    <div
      id="round-main-panel"
      class="area-main pixel-frame"
    >
      <div
        v-if="ui.cinematicActive"
        id="round-cinematic-viewport"
      >
        <CinematicViewport />
      </div>
      <div id="round-action-panel">
        <PrologueDecisionPanel v-if="game.currentRound?.isPrologue" />
        <PrologueOutcomeGate
          v-else-if="showPrologueGate"
          @continue="continuePastPrologueGate"
        />
        <VoteActionPanel v-else />
        <p
          v-if="pending"
          class="loading"
        >
          {{ t("common.loading") }}
        </p>
      </div>
    </div>
    <div
      id="round-hub-panel"
      class="area-hub pixel-frame"
    >
      <div
        v-if="game.moveToRoom?.enabled && game.yourStatus?.status === 'alive' && !game.currentRound?.isPrologue"
        class="hub-buttons"
      >
        <button
          type="button"
          class="settings-button"
          @click="router.push({ name: 'move-to-room' })"
        >
          {{ t("moveToRoom.button") }}
        </button>
      </div>
      <PlayerRoster />
      <YourStatusPanel />
    </div>
    <PlayerSettingsModal
      :open="showSettings"
      @close="showSettings = false"
    />
    <div
      id="round-narration-panel"
      class="area-narration pixel-frame"
    >
      <NarrationLog />
    </div>
  </section>
</template>

<style scoped>
/*
 * Grid-area based so the mobile-vs-desktop tiering can be adjusted later by changing
 * grid-template-areas/grid-template-columns without touching component internals. The
 * round's actual content -- the cinematic viewport (when active) plus whichever
 * action panel applies (prologue decision/outcome or the vote panel) -- lives in one
 * "main" panel, which is the big primary panel next to the hub, not a separate
 * cramped strip below it.
 *
 * Three tiers:
 * - Desktop (this base, >1024px): main+hub share the top rows (2fr/1fr), narration
 *   spans full width below.
 * - Tablet (721-1024px, e.g. an iPad in either orientation): main goes full-width,
 *   narration+hub share the row below it (narration wider).
 * - Mobile (<=720px, phones and small tablets in portrait): single column, fully
 *   stacked -- main and narration before hub, since the per-round story/vote is the
 *   primary task and the roster is reference info you check less often.
 */
.round-layout {
  display: grid;
  grid-template-areas:
    "header header"
    "main hub"
    "main hub"
    "narration narration";
  grid-template-columns: 2fr 1fr;
  grid-template-rows: auto auto auto 1fr;
  gap: var(--nbr-space-3);
  height: 100%;
  /* Grid's default align-content stretches leftover vertical space (e.g. .screen's
     min-height:100% exceeding this tier's actual content) into "auto" row tracks,
     which reads as a large blank gap. Rows should hug their content instead. */
  align-content: start;
}

@media (min-width: 721px) and (max-width: 1024px) {
  .round-layout {
    grid-template-areas:
      "header header"
      "main main"
      "narration hub";
    grid-template-columns: 2fr 1fr;
    grid-template-rows: auto auto auto;
    height: auto;
  }

  .area-hub {
    max-height: none;
    overflow-y: visible;
  }
}

@media (max-width: 720px) {
  .round-layout {
    grid-template-areas:
      "header"
      "main"
      "narration"
      "hub";
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto auto;
    height: auto;
  }

  .area-hub {
    /* Desktop relies on the grid row's fixed height + overflow-y to scroll a long
       roster in place; stacked mobile/tablet just lets the page itself scroll
       instead. */
    max-height: none;
    overflow-y: visible;
  }
}

.area-header {
  grid-area: header;
  display: flex;
  align-items: flex-start;
  gap: var(--nbr-space-2);
}

.area-header > :first-child {
  flex: 1;
  min-width: 0;
}
.area-main {
  grid-area: main;
  padding: var(--nbr-space-3);
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-3);
}

/* Grows to fill whatever height .area-main ends up with (it stretches to match the
   hub column via the grid's default align-items: stretch) -- gives the active round
   component (Prologue Decision/Outcome or the Vote panel) real room to push its own
   interaction button down to the bottom of the panel instead of sitting right under
   whatever content precedes it. */
#round-action-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
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
  /* Explicit bounds + its own scrollbar -- relying on the grid row's implicit "1fr"
     sizing let long-running games' narration text visually spill past the
     pixel-frame border once enough rounds had resolved, instead of scrolling. */
  min-height: 10rem;
  max-height: 22rem;
  overflow-y: auto;
  padding: var(--nbr-space-3);
}

.hub-buttons {
  display: flex;
  gap: var(--nbr-space-2);
  flex-wrap: wrap;
}

.settings-button {
  align-self: flex-start;
  background: none;
  color: var(--nbr-muted);
  border: 1px solid var(--nbr-border);
  padding: var(--nbr-space-1) var(--nbr-space-2);
  font-size: 0.85em;
}

.settings-button:hover {
  color: var(--nbr-fg);
  border-color: var(--nbr-accent);
}
</style>
