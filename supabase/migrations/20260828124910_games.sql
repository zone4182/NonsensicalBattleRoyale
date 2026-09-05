-- gm_player_id is added later (20260828124915) once battle_royale.players exists,
-- avoiding a circular FK dependency between games and players.
create table battle_royale.games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phase battle_royale.game_phase not null default 'setup',
  round_interval_minutes int not null check (round_interval_minutes > 0),
  missed_deadline_mode battle_royale.missed_deadline_mode not null,
  round1_start_mode battle_royale.round1_start_mode not null,
  round1_scheduled_at timestamptz,
  -- Exact double-vote cadence numbers are an open game-design question (v0.9 Open
  -- Questions #1); this stays a named strategy for function code to interpret rather
  -- than a precomputed schedule, since it must be recalculated from the live alive-count.
  double_vote_cadence_formula text not null default 'players_remaining',
  double_vote_floor_rounds int not null default 2 check (double_vote_floor_rounds >= 1),
  created_at timestamptz not null default now()
);
