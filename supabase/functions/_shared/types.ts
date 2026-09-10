// Hand-maintained row shapes mirroring supabase/migrations/*.sql. No `supabase gen
// types` wiring yet (tracked as a follow-up) — keep these in sync with the schema by
// hand until that's set up.

export type GamePhase = "setup" | "active" | "three_doors" | "ended";
export type MissedDeadlineMode = "forfeit_fatal" | "no_consequence" | "one_round_penalty";
export type Round1StartMode = "wait_for_all" | "gm_manual" | "scheduled";
export type RoundResolutionMode = "automatic" | "manual";
export type PlayerRole = "player" | "gm";
export type PlayerStatus = "alive" | "ghost";
export type PowerAcquisitionMethod = "random" | "earned" | "gm_grant";
export type PowerCategory = "informational" | "defensive" | "offensive" | "chaos";

export interface Game {
  id: string;
  name: string;
  phase: GamePhase;
  round_interval_minutes: number;
  missed_deadline_mode: MissedDeadlineMode;
  round1_start_mode: Round1StartMode;
  round1_scheduled_at: string | null;
  double_vote_cadence_formula: string;
  double_vote_enabled: boolean;
  double_vote_floor_rounds: number;
  survival_streak_threshold: number;
  round_resolution_mode: RoundResolutionMode;
  allow_vote_change: boolean;
  gm_player_id: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface Invite {
  id: string;
  game_id: string;
  token: string;
  display_name: string;
  role: PlayerRole;
  redeemed_at: string | null;
  created_at: string;
}

export interface Player {
  id: string;
  game_id: string;
  invite_id: string;
  role: PlayerRole;
  status: PlayerStatus;
  display_name: string;
  chosen_display_name: string | null;
  joined_at: string;
  eliminated_in_round_id: string | null;
  vote_suspended_through_round_number: number | null;
  is_bot: boolean;
}

export interface Round {
  id: string;
  game_id: string;
  round_number: number;
  opens_at: string;
  voting_deadline_at: string;
  resolved_at: string | null;
  eliminated_player_id: string | null;
  tie_break_method: string | null;
  double_vote_player_id: string | null;
  created_at: string;
}

export interface PowerGrant {
  id: string;
  game_id: string;
  round_id: string | null;
  power_key: string;
  granted_to_player_id: string;
  acquisition_method: PowerAcquisitionMethod;
  granted_by_gm_action_id: string | null;
  granted_at: string;
  used_at: string | null;
  effect_status: "pending" | "resolved" | "expired" | "no_effect";
  effect_detail: Record<string, unknown>;
}

export interface GmAction {
  id: string;
  game_id: string;
  round_id: string | null;
  gm_player_id: string;
  action_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface HelplineMessage {
  id: string;
  game_id: string;
  player_id: string;
  sender_role: PlayerRole;
  body: string;
  in_reply_to: string | null;
  created_at: string;
}
