<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useRoundActions } from "../../composables/useRoundActions";

// Deliberately small and separate from the roster (GAME-DESIGN.md §UI Layout) -- opens
// the private vote modal as its own route rather than an inline click-to-vote panel.
// Buttons here only ever appear when the underlying action is actually available --
// see useRoundActions.ts. What each action's current status IS (can still vote, vote
// locked, etc.) is surfaced in YourStatusPanel.vue instead, not duplicated here.
const { t } = useI18n();
const router = useRouter();
const { isGhost, hasOpenRound, canVote, canChangeVote, isDoubleVoteHolder, canMove } = useRoundActions();

function openVoteModal() {
  router.push({ name: "private-vote" });
}

function openMoveToRoom() {
  router.push({ name: "move-to-room" });
}
</script>

<template>
  <div class="vote-action-panel">
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
</template>

<style scoped>
.vote-action-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  /* No separate "top" narrative content in this panel -- the whole alert/button
     group sits together, anchored to the bottom of the round's main panel. */
  justify-content: flex-end;
  gap: var(--nbr-space-2);
}

.vote-status {
  color: var(--nbr-muted);
  font-size: 0.85em;
  margin-top: var(--nbr-space-1);
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
