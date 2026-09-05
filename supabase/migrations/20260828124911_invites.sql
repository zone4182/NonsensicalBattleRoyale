-- An invite whose token is never redeemed before Round 1 starts (under gm_manual or
-- scheduled start modes) is excluded from the game entirely, per the No-show resolution
-- rule (game-design v0.9 section 3a). Since a players row is only ever created on
-- redemption (see 20260828124913_players.sql), that exclusion needs no extra bookkeeping:
-- an unredeemed invite simply never becomes a player.
create table battle_royale.invites (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references battle_royale.games (id) on delete cascade,
  token text not null unique,
  display_name text not null,
  role battle_royale.player_role not null default 'player',
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

create index invites_game_id_idx on battle_royale.invites (game_id);
