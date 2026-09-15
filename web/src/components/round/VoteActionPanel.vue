<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useGameStore } from "../../stores/game";
import { useRoundActions } from "../../composables/useRoundActions";
import { ROOM_IMAGES } from "../../constants/manor";
import PlaceholderVisual from "../PlaceholderVisual.vue";

// Deliberately small and separate from the roster (GAME-DESIGN.md §UI Layout) -- opens
// the private vote modal as its own route rather than an inline click-to-vote panel.
// Buttons here only ever appear when the underlying action is actually available --
// see useRoundActions.ts. What each action's current status IS (can still vote, vote
// locked, etc.) is surfaced in YourStatusPanel.vue instead, not duplicated here.
const { t } = useI18n();
const router = useRouter();
const game = useGameStore();
const { isGhost, hasOpenRound, canVote, canChangeVote, isDoubleVoteHolder, canMove } = useRoundActions();

// Falls back to the generic placeholder (PlaceholderVisual's own default) until a
// given room actually has art -- see ROOM_IMAGES' own comment.
const currentRoomId = computed(() => game.moveToRoom?.yourRoomId ?? null);
const roomImage = computed(() => (currentRoomId.value ? ROOM_IMAGES[currentRoomId.value] : undefined));
const roomCaption = computed(() => (currentRoomId.value ? t(`moveToRoom.rooms.${currentRoomId.value}`) : undefined));

function openVoteModal() {
  router.push({ name: "private-vote" });
}

function openMoveToRoom() {
  router.push({ name: "move-to-room" });
}
</script>

<template>
  <div class="vote-action-panel">
    <div class="panel-top">
      <PlaceholderVisual
        :image="roomImage"
        :caption="roomCaption"
      />
    </div>
    <div class="panel-bottom">
      <template v-if="isGhost">
        <p class="vote-status">
          {{ t("voteAction.ghostNotice") }}
        </p>
      </template>
      <template v-else-if="!hasOpenRound">
        <p class="vote-status">
          {{ t("voteAction.noOpenRound") }}
        </p>
      </template>
      <template v-else>
        <p
          v-if="isDoubleVoteHolder"
          class="double-vote-alert"
        >
          <span
            class="alarm-icon"
            aria-hidden="true"
          >⚠</span>
          {{ t("voteAction.doubleVoteAlert") }}
        </p>
        <div
          v-if="canVote || canMove"
          class="action-buttons"
        >
          <button
            v-if="canVote"
            type="button"
            @click="openVoteModal"
          >
            {{ canChangeVote ? t("voteAction.changeVote") : t("voteAction.vote") }}
          </button>
          <button
            v-if="canMove"
            type="button"
            class="move-button"
            @click="openMoveToRoom"
          >
            {{ t("moveToRoom.button") }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.vote-action-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Pushed to the bottom via the auto margin -- keeps the room image at the top and
   the actual alert/button group anchored to the bottom of the panel, same pattern as
   PrologueDecisionPanel.vue / PrologueOutcomeGate.vue. */
.panel-bottom {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-2);
}

.vote-status {
  color: var(--nbr-muted);
  font-size: 0.85em;
  margin: 0;
}

.action-buttons {
  display: flex;
  gap: var(--nbr-space-2);
}

.action-buttons button {
  flex: 1;
}

.move-button {
  background: none;
  color: var(--nbr-muted);
  border: 1px solid var(--nbr-border);
}

.move-button:hover {
  color: var(--nbr-fg);
  border-color: var(--nbr-accent);
}

.double-vote-alert {
  display: flex;
  align-items: center;
  gap: var(--nbr-space-1);
  margin: 0;
  padding: var(--nbr-space-1) var(--nbr-space-2);
  color: var(--nbr-danger);
  border: 1px solid var(--nbr-danger);
  font-size: 0.85em;
}

.alarm-icon {
  font-size: 1.1em;
  line-height: 1;
}
</style>
