// Placeholder narrative content for round 1 (the "prologue round" -- see
// resolve-round/index.ts's prologue branch and submit-prologue-vote/index.ts). Real,
// branching story content is deferred (per the user); this is deliberately a single
// fixed line per beat, not a story tree yet.
import type { PrologueOption } from "./types.ts";

export const PROLOGUE_OPTIONS: readonly PrologueOption[] = ["call_police", "get_help", "drink_whisky"];

export const PROLOGUE_KITCHEN_NARRATION =
  "Panic-stricken and demoralized, you all return to the kitchen. Everyone is screaming, talking over each other, arguing about what your next move should be.";

// One line acknowledging which action the group actually took -- shown in the
// narration log immediately once round 1 resolves. The full "letter in the study" story
// beat that follows this is rendered client-side only (see
// web/src/components/round/PrologueOutcomeGate.vue), not duplicated here.
export const PROLOGUE_OUTCOME_NARRATION: Record<PrologueOption, string> = {
  call_police: "In the end, the group agrees: call the police. Phones come out, dialed with shaking hands -- but the calls won't connect. No signal, anywhere in the house.",
  get_help: "In the end, the group agrees: go outside and get help. You march for the front door together -- only to find it locked. Every door is. Every window is stuck fast, no matter how hard anyone pulls.",
  drink_whisky: "In the end, the group agrees: nobody's thinking straight anyway. Someone cracks open a bottle of whisky from the cabinet, and it goes around the room. It doesn't make anything better. It doesn't make anything worse, either.",
};

// Round 2's own opening beat -- the real first voting round. Recaps the stakes now that
// the "rules" letter (rendered client-side, see PrologueOutcomeGate.vue) has been read.
export const ROUND_TWO_RECAP_NARRATION =
  "The vote is anonymous, but final: whoever receives the most votes when the sun sets is gone from this house, for good. Only one of you will ever walk out the front door again. Choose carefully -- and choose first.";

// games.max_consecutive_ties refinement (see resolve-round/index.ts's tie-handling
// branch) -- shown the first time a fresh streak of top-vote ties begins, before the
// max is ever actually reached. Only fires once per streak, not on every tied round.
export const TIE_STREAK_WARNING_NARRATION =
  " The manor is not happy with your indecision. If this continues, it will interfere.";

// Fired once games.max_consecutive_ties is reached, per games.max_ties_behavior. Both
// deliberately bypass Ward (see resolve-round/index.ts) -- the in-universe reasoning
// for why is baked into the text itself, not left as an unexplained rule change.
export function coinFlipForcedNarration(name: string): string {
  return ` The house grows tired of your indecision. It reaches in itself this time -- a coin spins in the dark, because in here, hiding behind careful strategy buys no one safety tonight. ${name} loses the toss.`;
}

export function leastVotesForcedNarration(name: string): string {
  return ` The house has had enough of your silence. It turns its eye toward whoever felt safest -- ${name}, barely suspected by anyone, is the one it chooses. Being invisible was never truly safe.`;
}
