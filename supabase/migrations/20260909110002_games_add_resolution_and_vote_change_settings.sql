-- 'automatic': the resolve-round cron (see 20260909110001) actually resolves this
-- game's overdue rounds. 'manual' (default, matches pre-existing behavior for every
-- game created before this column existed): only a GM's own "Resolve now" click does.
create type battle_royale.round_resolution_mode as enum ('automatic', 'manual');

alter table battle_royale.games
  add column round_resolution_mode battle_royale.round_resolution_mode not null default 'manual',
  -- Lets a player's submit-vote call replace their existing cast vote(s) for the open
  -- round instead of being rejected once their entitlement is used up. Off by default --
  -- "a vote is final" was the original, unconfigured behavior.
  add column allow_vote_change boolean not null default false;
