-- Deliberately a separate table, not a battle_royale.rounds phase variant: Three Doors
-- (game-design v0.9 section 14) is exactly one event per game (not per round), a door
-- pick has a different shape than a vote (a number 1-3, no target player), and a
-- collision (two players picking the same number) is a valid game outcome, not a
-- constraint violation — so no unique constraint on door_number itself. Collision
-- detection and outcome resolution are application logic (resolve-doors function).
create table battle_royale.door_picks (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references battle_royale.games (id) on delete cascade,
  player_id uuid not null references battle_royale.players (id),
  door_number smallint not null check (door_number between 1 and 3),
  picked_at timestamptz not null default now(),
  -- 'win' | 'lose_all', set once resolve-doors runs.
  resolved_outcome text,
  unique (game_id, player_id)
);
