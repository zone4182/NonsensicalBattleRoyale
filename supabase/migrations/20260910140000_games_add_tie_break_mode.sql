-- Configurable tie-break behavior for vote resolution. 'random' is the existing
-- coin-flip-among-the-tied-players behavior (default, unchanged). 'no_elimination'
-- is new: a tie means no one is eliminated this round at all, narrated as everyone
-- getting a reprieve. An actual Postgres enum (not text+check), matching the existing
-- convention (missed_deadline_mode, round_resolution_mode, etc.) -- new strategies
-- can be added later with `alter type ... add value`.
create type battle_royale.tie_break_mode as enum ('random', 'no_elimination');

alter table battle_royale.games
  add column tie_break_mode battle_royale.tie_break_mode not null default 'random';
