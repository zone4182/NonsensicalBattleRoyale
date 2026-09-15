import { computed } from "vue";
import { useGameStore } from "../stores/game";

// Single source of truth for "what can this player actually do right now, this
// round" -- shared by VoteActionPanel.vue (which button to show) and
// YourStatusPanel.vue (which status line to show). Used to live duplicated across
// both; kept here once so the vote button's visibility and the status panel's wording
// can never disagree with each other.
export function useRoundActions() {
  const game = useGameStore();

  const isGhost = computed(() => game.yourStatus?.status === "ghost");
  const hasOpenRound = computed(() => game.currentRound !== null);
  const isPrologueRound = computed(() => game.currentRound?.isPrologue ?? false);

  // game.currentRound (not votesRemainingRaw) is the real signal for "is there
  // anything to vote on right now" -- votesRemainingRaw is null both when there's no
  // open round AND once yourStatus has genuinely loaded with nothing to report, so
  // defaulting it to 0 and reading that as "entitlement exhausted" produced a false
  // "you've cast your vote, it's final" before round 1 even starts (or between
  // rounds), when no vote had been cast at all.
  const votesRemainingRaw = computed(() => game.yourStatus?.votesRemainingThisRound ?? null);
  const votesRemaining = computed(() => votesRemainingRaw.value ?? 0);
  // A player can lock their own vote in early (lock-vote), which overrides
  // games.allow_vote_change for them specifically -- see submit-vote/index.ts's
  // matching check. Locked always wins over the game-wide setting.
  const voteLocked = computed(() => game.yourStatus?.voteLockedThisRound ?? false);
  // Entitlement exhausted, but games.allow_vote_change lets a fresh submit-vote call
  // replace the existing cast rather than being rejected -- see submit-vote/index.ts.
  const canChangeVote = computed(() => votesRemainingRaw.value === 0 && game.allowVoteChange && !voteLocked.value);
  const canVote = computed(
    () =>
      hasOpenRound.value &&
      !isPrologueRound.value &&
      ((votesRemaining.value > 0 && !voteLocked.value) || canChangeVote.value),
  );
  // This round's entitlement, not "has cast a double vote yet" -- stays true for the
  // whole round (win or lose the badge as votes get cast) so the double-vote holder
  // always knows going in, not just while votesRemaining still happens to read 2.
  const isDoubleVoteHolder = computed(() => game.yourStatus?.isDoubleVoteHolder ?? false);

  const moveToRoomRound = computed(() => game.moveToRoom?.currentRound ?? null);
  const canStillMove = computed(() => moveToRoomRound.value !== null && moveToRoomRound.value.yourMoveSubmitted === null);
  const canStillGuess = computed(
    () => !!moveToRoomRound.value && moveToRoomRound.value.guessTarget !== null && moveToRoomRound.value.yourGuessSubmitted === null,
  );
  // Whether there's still something to do in the Move-to-Room mini-game this round --
  // either the move itself, or a guess assigned but not yet submitted. Ghosts don't
  // move; the mini-game doesn't run during the prologue round or between rounds.
  const canMove = computed(
    () =>
      !isGhost.value &&
      game.moveToRoom?.enabled === true &&
      !isPrologueRound.value &&
      hasOpenRound.value &&
      (canStillMove.value || canStillGuess.value),
  );

  return {
    isGhost,
    hasOpenRound,
    isPrologueRound,
    votesRemaining,
    votesRemainingRaw,
    voteLocked,
    canChangeVote,
    canVote,
    isDoubleVoteHolder,
    canMove,
    canStillMove,
    canStillGuess,
  };
}
