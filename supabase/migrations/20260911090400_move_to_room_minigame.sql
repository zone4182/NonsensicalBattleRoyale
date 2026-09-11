-- Move-to-Room mini-game (concept/mini-games/move-to-room-and-guess-random-appointed-guest.md).
-- Room ids are validated against a fixed list here (not a full postgres enum, so
-- adding a room later is a plain migration, not an enum-alter dance) -- the
-- authoritative definition (floor, grid position, staircase flag, adjacency) lives
-- in supabase/functions/_shared/mansion.ts, this check constraint just mirrors it.
create table battle_royale.player_rooms (
  game_id uuid not null references battle_royale.games (id) on delete cascade,
  player_id uuid not null references battle_royale.players (id) on delete cascade,
  current_room_id text not null check (current_room_id in (
    'library', 'entrance_hall', 'living_room', 'dining_room', 'kitchen', 'toilet',
    'guest_bedroom_1', 'landing', 'master_bedroom', 'guest_bedroom_2', 'bathroom'
  )),
  updated_at timestamptz not null default now(),
  primary key (game_id, player_id)
);

-- A player's pending move submission for the currently-open round -- applied to
-- player_rooms.current_room_id when that round resolves. Re-submitting before
-- resolution just replaces the row (upsert), matching how a private vote can be
-- reconsidered right up until the round actually resolves.
create table battle_royale.round_room_moves (
  round_id uuid not null references battle_royale.rounds (id) on delete cascade,
  player_id uuid not null references battle_royale.players (id) on delete cascade,
  target_room_id text not null check (target_room_id in (
    'library', 'entrance_hall', 'living_room', 'dining_room', 'kitchen', 'toilet',
    'guest_bedroom_1', 'landing', 'master_bedroom', 'guest_bedroom_2', 'bathroom'
  )),
  submitted_at timestamptz not null default now(),
  primary key (round_id, player_id)
);

-- Who each player is asked to guess about this round -- assigned once, at the same
-- moment a round is created (alongside the double-vote holder pick), not lazily on
-- first fetch, so the target stays stable across repeated get-game-state polls.
create table battle_royale.round_guess_assignments (
  round_id uuid not null references battle_royale.rounds (id) on delete cascade,
  guesser_player_id uuid not null references battle_royale.players (id) on delete cascade,
  target_player_id uuid not null references battle_royale.players (id) on delete cascade,
  primary key (round_id, guesser_player_id)
);

-- A player's guess submission for their assigned target this round. `correct` stays
-- null until the round resolves (same "not revealed until resolution" shape as
-- everything else in this game), then gets set once and never changes.
create table battle_royale.round_room_guesses (
  round_id uuid not null references battle_royale.rounds (id) on delete cascade,
  guesser_player_id uuid not null references battle_royale.players (id) on delete cascade,
  guessed_room_id text not null check (guessed_room_id in (
    'library', 'entrance_hall', 'living_room', 'dining_room', 'kitchen', 'toilet',
    'guest_bedroom_1', 'landing', 'master_bedroom', 'guest_bedroom_2', 'bathroom'
  )),
  correct boolean,
  submitted_at timestamptz not null default now(),
  primary key (round_id, guesser_player_id)
);

alter table battle_royale.games
  add column move_to_room_enabled boolean not null default false;

-- Simple GM-and-self-visible counter -- see the mini-game doc's "Points scope"
-- resolution: track it, don't build a spend mechanism (points.md's economy is still
-- undecided).
alter table battle_royale.players
  add column room_guess_points integer not null default 0;
