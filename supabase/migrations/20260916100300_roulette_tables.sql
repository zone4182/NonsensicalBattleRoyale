-- Russian Roulette endgame state (see concept/mini-games/russian-roulette-endgame.md).
-- One row per game, created the moment the game enters the 'russian_roulette' phase,
-- deleted along with the game (no separate cleanup needed -- a finished game keeps its
-- rows for history the same way rounds/votes do, this just doesn't get re-created).
create table battle_royale.roulette_state (
  game_id uuid primary key references battle_royale.games (id) on delete cascade,
  -- Starts at 2; drops to 1 after the first kill. The game always ends once alive
  -- count reaches 1, so this never needs to reach 0 in a valid game.
  bullets_remaining smallint not null default 2 check (bullets_remaining between 1 and 2),
  -- Ordered array of player id strings for the *current* pass -- reshuffled after
  -- every hit and after every full pass that ends with no hit.
  turn_order jsonb not null default '[]'::jsonb,
  current_turn_index smallint not null default 0,
  -- Increments every reshuffle -- stamped onto each roulette_shots row below so a
  -- pass's shots can be grouped together for narration/GM display.
  pass_number smallint not null default 1,
  -- Player ids currently required to self-target on their next turn (the other-shot
  -- miss penalty) -- an array, not a single id, because two different players can each
  -- pick up this flag before either one's next turn actually arrives.
  forced_self_only_player_ids jsonb not null default '[]'::jsonb,
  current_turn_deadline_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Append-only shot log -- mirrors door_picks' role for Three Doors. round_number is
-- which pass this shot belongs to (increments on every reshuffle), for narration/GM
-- display grouping, not a battle_royale.rounds row (this endgame has no relation to
-- the normal per-round voting loop).
create table battle_royale.roulette_shots (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references battle_royale.games (id) on delete cascade,
  round_number smallint not null,
  shooter_player_id uuid not null references battle_royale.players (id),
  target_player_id uuid not null references battle_royale.players (id),
  is_self boolean not null,
  hit boolean not null,
  created_at timestamptz not null default now()
);

create index roulette_shots_game_id_idx on battle_royale.roulette_shots (game_id);
