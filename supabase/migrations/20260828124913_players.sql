-- eliminated_in_round_id is added later (20260828124919) once battle_royale.rounds exists.
create table battle_royale.players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references battle_royale.games (id) on delete cascade,
  invite_id uuid not null unique references battle_royale.invites (id),
  role battle_royale.player_role not null,
  status battle_royale.player_status not null default 'alive',
  display_name text not null,
  joined_at timestamptz not null default now(),
  unique (game_id, invite_id)
);

create index players_game_id_idx on battle_royale.players (game_id);
