-- action_type is a free string, not an enum, and payload is jsonb: the named menu of
-- GM twists is explicitly not yet designed (game-design v0.9 sections 12.2 / 13), and
-- the category boundary is deliberately unbounded ("no category of game state is
-- off-limits"), so this table must not need a migration per new twist type.
create table battle_royale.gm_actions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references battle_royale.games (id) on delete cascade,
  round_id uuid references battle_royale.rounds (id),
  gm_player_id uuid not null references battle_royale.players (id),
  -- e.g. 'tie_break' | 'power_grant' | 'twist' | 'narration_edit' | 'other'
  action_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index gm_actions_game_id_idx on battle_royale.gm_actions (game_id);
