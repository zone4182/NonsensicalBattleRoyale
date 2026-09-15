<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useGameStore } from "../../stores/game";
import { POWERS_CATALOGUE, powerSetupBlock } from "../../constants/powers";
import { useRoundActions } from "../../composables/useRoundActions";
import PowerUseControls from "./PowerUseControls.vue";

const { t } = useI18n();
const game = useGameStore();
const { isGhost, hasOpenRound, isPrologueRound, votesRemaining, voteLocked, canChangeVote, canMove } = useRoundActions();

// Same Powers-vs-Items split as the GM setup screen (informational/defensive =
// Powers, offensive/chaos = Items) -- purely presentational grouping, both still come
// from the same held-powers list.
function blockOf(powerKey: string): "powers" | "items" {
  const entry = POWERS_CATALOGUE.find((p) => p.key === powerKey);
  return entry ? powerSetupBlock(entry.category) : "powers";
}
const powersHeld = computed(() => (game.yourStatus?.heldPowers ?? []).filter((p) => blockOf(p.powerKey) === "powers"));
const itemsHeld = computed(() => (game.yourStatus?.heldPowers ?? []).filter((p) => blockOf(p.powerKey) === "items"));

// One line summarizing where the player's vote stands this round -- the same states
// VoteActionPanel.vue's button visibility is driven by (useRoundActions.ts), just
// worded as a status rather than an instruction. No message at all during the
// prologue round or when there's no open round -- nothing to report yet.
const voteStatusMessage = computed(() => {
  if (isGhost.value || !hasOpenRound.value || isPrologueRound.value) return null;
  if (voteLocked.value) return t("yourStatus.voteLocked");
  if (canChangeVote.value) return t("yourStatus.canChangeVote");
  if (votesRemaining.value > 0) return t("yourStatus.canVote");
  return t("yourStatus.voteFinal");
});

// Deliberately vague on purpose (game-design's "players discover mechanics by
// playing" principle) -- names neither the mini-game nor what's left to do in it,
// just that something is.
const minigameStatusMessage = computed(() => (canMove.value ? t("yourStatus.canDoMinigameActions") : null));
</script>

<template>
  <div
    id="your-status-panel"
    class="your-status"
  >
    <h2>{{ t("yourStatus.title") }}</h2>
    <p>{{ game.yourStatus?.status ?? t("yourStatus.unknown") }}</p>
    <p
      v-if="voteStatusMessage"
      class="action-status"
    >
      {{ voteStatusMessage }}
    </p>
    <p
      v-if="minigameStatusMessage"
      class="action-status"
    >
      {{ minigameStatusMessage }}
    </p>
    <p
      v-if="game.moveToRoom"
      class="points"
    >
      {{ t("yourStatus.points", { points: game.moveToRoom.points }) }}
    </p>

    <template v-if="powersHeld.length || itemsHeld.length">
      <div
        v-if="powersHeld.length"
        id="your-status-powers-block"
      >
        <h3>{{ t("gmSetup.powers.catalogueHeading") }}</h3>
        <ul class="power-list">
          <li
            v-for="p in powersHeld"
            :key="p.powerKey"
          >
            <PowerUseControls
              :power-key="p.powerKey"
              :category="p.category"
              :count="p.count"
            />
          </li>
        </ul>
      </div>
      <div
        v-if="itemsHeld.length"
        id="your-status-items-block"
      >
        <h3>{{ t("gmSetup.powers.itemsHeading") }}</h3>
        <ul class="power-list">
          <li
            v-for="p in itemsHeld"
            :key="p.powerKey"
          >
            <PowerUseControls
              :power-key="p.powerKey"
              :category="p.category"
              :count="p.count"
            />
          </li>
        </ul>
      </div>
    </template>
    <p
      v-else
      class="field-hint"
    >
      {{ t("yourStatus.noPowers") }}
    </p>
  </div>
</template>

<style scoped>
.action-status {
  margin: 0;
  color: var(--nbr-accent);
  font-size: 0.9em;
}

.points {
  color: var(--nbr-accent);
  font-weight: bold;
}

.your-status h3 {
  margin-top: var(--nbr-space-3);
  font-size: 0.95em;
  color: var(--nbr-muted);
}

.power-list {
  list-style: none;
  padding: 0;
  margin-top: var(--nbr-space-1);
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-2);
}

.field-hint {
  color: var(--nbr-muted);
  font-size: 0.85em;
}
</style>
