create table battle_royale.rounds (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references battle_royale.games (id) on delete cascade,
  round_number int not null check (round_number > 0),
  opens_at timestamptz not null,
  voting_deadline_at timestamptz not null,
  resolved_at timestamptz,
  eliminated_player_id uuid references battle_royale.players (id),
  -- 'none' | 'gm' | 'random' — how an elimination tie (if any) was broken.
  tie_break_method text,
  double_vote_player_id uuid references battle_royale.players (id),
  created_at timestamptz not null default now(),
  unique (game_id, round_number)
);

create index rounds_game_id_idx on battle_royale.rounds (game_id);
