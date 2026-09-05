create table battle_royale.narration_log (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references battle_royale.games (id) on delete cascade,
  round_id uuid references battle_royale.rounds (id),
  body text not null,
  edited_by_gm_action_id uuid references battle_royale.gm_actions (id),
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index narration_log_game_id_idx on battle_royale.narration_log (game_id);
