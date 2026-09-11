<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import RoundHeader from "../components/round/RoundHeader.vue";
import LocaleSwitcher from "../components/LocaleSwitcher.vue";
import CinematicViewport from "../components/round/CinematicViewport.vue";
import PlayerRoster from "../components/round/PlayerRoster.vue";
import YourStatusPanel from "../components/round/YourStatusPanel.vue";
import NarrationLog from "../components/round/NarrationLog.vue";
import VoteActionPanel from "../components/round/VoteActionPanel.vue";
import PlayerSettingsModal from "../components/PlayerSettingsModal.vue";
import { useGameStore } from "../stores/game";
import { useSessionStore } from "../stores/session";
import { useUiStore } from "../stores/ui";
import { useApiCall } from "../composables/useApiCall";
import { usePoll } from "../composables/usePoll";

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
      <LocaleSwitcher class="header-locale-switcher" />
    </div>
    <div
      v-if="ui.cinematicActive"
      class="area-viewport pixel-frame"
    >
      <CinematicViewport />
    </div>
    <div class="area-hub pixel-frame">
      <div class="hub-buttons">
        <button
          type="button"
          class="settings-button"
          @click="showSettings = true"
        >
          {{ t("playerSettings.button") }}
        </button>
        <button
          v-if="game.moveToRoom?.enabled && game.yourStatus?.status === 'alive'"
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
    <div class="area-narration pixel-frame">
      <NarrationLog />
    </div>
    <div class="area-action">
      <VoteActionPanel />
      <p
        v-if="pending"
        class="loading"
      >
        {{ t("common.loading") }}
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
 *
 * Three tiers:
 * - Desktop (this base, >1024px): viewport+hub share the top row (2fr/1fr),
 *   narration+action share the bottom row.
 * - Tablet (721-1024px, e.g. an iPad in either orientation): there isn't enough
 *   width for that same 2-column split without squeezing the hub -- viewport goes
 *   full-width instead, narration+action stack in the wider left column below it,
 *   hub becomes a full-height column on the right.
 * - Mobile (<=720px, phones and small tablets in portrait): single column, fully
 *   stacked. narration+action come before hub -- the per-round story/vote is the
 *   primary task, the roster is reference info you check less often.
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
  /* Grid's default align-content stretches leftover vertical space (e.g. .screen's
     min-height:100% exceeding this tier's actual content) into "auto" row tracks --
     including an empty one (the viewport row when CinematicViewport is inactive),
     which reads as a large blank gap. Rows should hug their content instead. */
  align-content: start;
}

@media (min-width: 721px) and (max-width: 1024px) {
  .round-layout {
    grid-template-areas:
      "header header"
      "viewport viewport"
      "narration hub"
      "action hub";
    grid-template-columns: 2fr 1fr;
    grid-template-rows: auto auto auto auto;
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
      "viewport"
      "narration"
      "action"
      "hub";
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto auto auto;
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
