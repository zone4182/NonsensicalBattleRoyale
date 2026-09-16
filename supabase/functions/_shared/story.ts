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

// Endgame transition (concept/mini-games/russian-roulette-endgame.md) -- shown once,
// the moment alive count drops to 3, before either endgame's own narration begins.
// Text varies by games.endgame_mode; same beat either way (three are left, one final
// trial remains before anyone can go home).
export const ENDGAME_TRANSITION_NARRATION: Record<"three_doors" | "russian_roulette", string> = {
  three_doors:
    "Only three of you remain. The house leads you down, deeper than anyone has gone this whole weekend, to a chamber none of you remember from before -- and there, waiting, are three doors.",
  russian_roulette:
    "Only three of you remain. The house leads you back to where the jar once sat by the door -- but the jar is gone now. In its place: a revolver, and two bullets.",
};

// Shown once, right as the Russian Roulette endgame actually begins (after the shared
// transition screen above) -- explains the mechanic itself, since nothing about it was
// ever told to players beforehand (same "discover the rules by living them" principle
// as the double vote and every hidden power).
export const RUSSIAN_ROULETTE_INTRO_NARRATION =
  "The revolver holds six chambers. Two carry a bullet; the rest are empty, and no one -- not even the house -- will say which is which. Each of you, in turn, will choose: turn the gun on yourself, or on one of the others left standing. Whoever is still breathing when the chambers finally empty walks out the front door, alone.";

export function rouletteSelfHitNarration(name: string): string {
  return `The gun does not miss this time. ${name} turns it on themselves -- and the house takes what it's owed.`;
}

export function rouletteOtherHitNarration(shooterName: string, targetName: string): string {
  return `${shooterName} aims across the room. ${targetName} doesn't get to argue.`;
}

export function rouletteMissNarration(shooterName: string, isSelf: boolean, targetName: string): string {
  return isSelf
    ? `${shooterName} turns the gun on themselves. Empty. The house isn't finished with anyone yet.`
    : `${shooterName} aims at ${targetName}. Empty. For now.`;
}

export function rouletteWinnerNarration(name: string): string {
  return `The chambers are spent. ${name} is still standing -- and somewhere in the house, a door that was locked all weekend finally clicks open.`;
}
