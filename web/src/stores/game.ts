import { defineStore } from "pinia";
import { ref } from "vue";
import { callFunction } from "../lib/api";

// Field names mirror supabase/functions/_shared/types.ts (Game.phase, Player.status)
// so later milestones can populate real data without renaming.
export type GamePhase = "setup" | "active" | "three_doors" | "ended";
export type PlayerStatus = "alive" | "ghost";
export type RoundResolutionMode = "automatic" | "manual";

export type RosterPlayerRole = "player" | "gm";

export interface RosterPlayer {
  id: string;
  displayName: string;
  status: PlayerStatus;
  role: RosterPlayerRole;
  isBot: boolean;
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
  voteLockedThisRound: boolean;
}

// Mirrors supabase/functions/_shared/mansion.ts's RoomId union.
export type RoomId =
  | "library"
  | "entrance_hall"
  | "living_room"
  | "dining_room"
  | "kitchen"
  | "toilet"
  | "guest_bedroom_1"
  | "landing"
  | "master_bedroom"
  | "guest_bedroom_2"
  | "bathroom";

export interface RoomOccupancy {
  roomId: RoomId;
  heat: number;
}

export interface MoveToRoomCurrentRound {
  yourMoveSubmitted: RoomId | null;
  guessTarget: { playerId: string; displayName: string } | null;
  yourGuessSubmitted: RoomId | null;
}

export interface MoveToRoomState {
  enabled: boolean;
  yourRoomId: RoomId | null;
  points: number;
  occupancy: RoomOccupancy[];
  currentRound: MoveToRoomCurrentRound | null;
}

interface GetGameStateResponse {
  game_id: string;
  game_name: string;
  phase: GamePhase;
  round_resolution_mode: RoundResolutionMode;
  allow_vote_change: boolean;
  current_round: { round_number: number; voting_deadline_at: string | null } | null;
  players: { id: string; display_name: string; status: PlayerStatus; role: RosterPlayerRole; is_bot: boolean }[];
  your_status: {
    status: PlayerStatus;
    held_powers: { power_key: string; category: string; count: number }[];
    votes_remaining_this_round: number | null;
    vote_locked_this_round: boolean;
  };
  narration_entries: { id: string; text: string; created_at: string }[];
  move_to_room: {
    enabled: boolean;
    your_room_id: RoomId | null;
    points: number;
    occupancy: { room_id: RoomId; heat: number }[];
    current_round: {
      your_move_submitted: RoomId | null;
      guess_target: { player_id: string; display_name: string } | null;
      your_guess_submitted: RoomId | null;
    } | null;
  } | null;
}

export const useGameStore = defineStore("game", () => {
  const gameId = ref<string | null>(null);
  const gameName = ref<string | null>(null);
  const phase = ref<GamePhase | null>(null);
  const roundResolutionMode = ref<RoundResolutionMode | null>(null);
  const allowVoteChange = ref(false);
  const currentRound = ref<CurrentRound | null>(null);
  const players = ref<RosterPlayer[]>([]);
  const yourStatus = ref<YourStatus | null>(null);
  const narrationEntries = ref<NarrationEntry[]>([]);
  const moveToRoom = ref<MoveToRoomState | null>(null);

  // Single source for populating this store -- reused by every screen that needs
  // fresh roster/phase data (main round, vote modal, seance, three doors) rather than
  // duplicating the fetch/mapping logic in each one.
  async function refresh(token: string) {
    const raw = await callFunction<GetGameStateResponse>("get-game-state", {}, { token });
    gameId.value = raw.game_id;
    gameName.value = raw.game_name;
    phase.value = raw.phase;
    roundResolutionMode.value = raw.round_resolution_mode;
    allowVoteChange.value = raw.allow_vote_change;
    currentRound.value = raw.current_round
      ? { roundNumber: raw.current_round.round_number, votingDeadlineAt: raw.current_round.voting_deadline_at }
      : null;
    players.value = raw.players.map((p) => ({ id: p.id, displayName: p.display_name, status: p.status, role: p.role, isBot: p.is_bot }));
    yourStatus.value = {
      status: raw.your_status.status,
      heldPowers: raw.your_status.held_powers.map((p) => ({
        powerKey: p.power_key,
        category: p.category,
        count: p.count,
      })),
      votesRemainingThisRound: raw.your_status.votes_remaining_this_round,
      voteLockedThisRound: raw.your_status.vote_locked_this_round,
    };
    narrationEntries.value = raw.narration_entries.map((n) => ({ id: n.id, text: n.text, createdAt: n.created_at }));
    moveToRoom.value = raw.move_to_room
      ? {
          enabled: raw.move_to_room.enabled,
          yourRoomId: raw.move_to_room.your_room_id,
          points: raw.move_to_room.points,
          occupancy: raw.move_to_room.occupancy.map((o) => ({ roomId: o.room_id, heat: o.heat })),
          currentRound: raw.move_to_room.current_round
            ? {
                yourMoveSubmitted: raw.move_to_room.current_round.your_move_submitted,
                guessTarget: raw.move_to_room.current_round.guess_target
                  ? {
                      playerId: raw.move_to_room.current_round.guess_target.player_id,
                      displayName: raw.move_to_room.current_round.guess_target.display_name,
                    }
                  : null,
                yourGuessSubmitted: raw.move_to_room.current_round.your_guess_submitted,
              }
            : null,
        }
      : null;
  }

  return {
    gameId,
    gameName,
    phase,
    roundResolutionMode,
    allowVoteChange,
    currentRound,
    players,
    yourStatus,
    narrationEntries,
    moveToRoom,
    refresh,
  };
});
