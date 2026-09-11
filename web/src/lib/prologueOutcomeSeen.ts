// Whether this browser has already clicked through the round-1 -> round-2 transition
// beat (the "letter in the study" + "And so it begins..." screen) for a given game.
// localStorage (not sessionStorage) -- unlike the one-time invite-token reveal, this
// must survive a reload/revisit for the rest of the game, not just this tab's session.
const PREFIX = "nbr.seenPrologueOutcome.";

export function hasSeenPrologueOutcome(gameId: string): boolean {
  try {
    return localStorage.getItem(PREFIX + gameId) === "1";
  } catch {
    return false;
  }
}

export function markPrologueOutcomeSeen(gameId: string): void {
  try {
    localStorage.setItem(PREFIX + gameId, "1");
  } catch {
    // Best-effort -- a private-browsing tab or a full storage quota just means this
    // gate might show again, not a functional break.
  }
}
