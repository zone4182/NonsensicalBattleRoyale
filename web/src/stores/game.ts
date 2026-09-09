import { defineStore } from "pinia";
import { ref } from "vue";
import { callFunction } from "../lib/api";

// Field names mirror supabase/functions/_shared/types.ts (Game.phase, Player.status)
// so later milestones can populate real data without renaming.
export type GamePhase = "setup" | "active" | "three_doors" | "ended";
export type PlayerStatus = "alive" | "ghost";

export type RosterPlayerRole = "player" | "gm";

export interface RosterPlayer {
  id: string;
  displayName: string;
  status: PlayerStatus;
  role: RosterPlayerRole;
}

export interface NarrationEntry {
  id: string;
  text: string;
  createdAt: string;
}

export interface CurrentRound {
  roundNumber: number;
  votingDeadlineAt: string | null;
}

export interface HeldPower {
  powerKey: string;
  category: string;
  count: number;
}

export interface YourStatus {
  status: PlayerStatus;
  heldPowers: HeldPower[];
  votesRemainingThisRound: number | null;
}

interface GetGameStateResponse {
  phase: GamePhase;
  current_round: { round_number: number; voting_deadline_at: string | null } | null;
  players: { id: string; display_name: string; status: PlayerStatus; role: RosterPlayerRole }[];
  your_status: {
    status: PlayerStatus;
    held_powers: { power_key: string; category: string; count: number }[];
    votes_remaining_this_round: number | null;
  };
  narration_entries: { id: string; text: string; created_at: string }[];
}

export const useGameStore = defineStore("game", () => {
  const phase = ref<GamePhase | null>(null);
  const currentRound = ref<CurrentRound | null>(null);
  const players = ref<RosterPlayer[]>([]);
  const yourStatus = ref<YourStatus | null>(null);
  const narrationEntries = ref<NarrationEntry[]>([]);

  // Single source for populating this store -- reused by every screen that needs
  // fresh roster/phase data (main round, vote modal, seance, three doors) rather than
  // duplicating the fetch/mapping logic in each one.
  async function refresh(token: string) {
    const raw = await callFunction<GetGameStateResponse>("get-game-state", {}, { token });
    phase.value = raw.phase;
    currentRound.value = raw.current_round
      ? { roundNumber: raw.current_round.round_number, votingDeadlineAt: raw.current_round.voting_deadline_at }
      : null;
    players.value = raw.players.map((p) => ({ id: p.id, displayName: p.display_name, status: p.status, role: p.role }));
    yourStatus.value = {
      status: raw.your_status.status,
      heldPowers: raw.your_status.held_powers.map((p) => ({
        powerKey: p.power_key,
        category: p.category,
        count: p.count,
      })),
      votesRemainingThisRound: raw.your_status.votes_remaining_this_round,
    };
    narrationEntries.value = raw.narration_entries.map((n) => ({ id: n.id, text: n.text, createdAt: n.created_at }));
  }

  return { phase, currentRound, players, yourStatus, narrationEntries, refresh };
});
