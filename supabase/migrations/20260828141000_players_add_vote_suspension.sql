-- Tracks the one_round_penalty missed-deadline consequence: a player who casts zero
-- votes in a round is barred from voting in exactly the next round. Stored as
-- "suspended through round_number N" rather than a boolean or join table, since
-- rounds.round_number is already the natural per-game clock and only one active
-- suspension can exist per player at a time.
alter table battle_royale.players
  add column vote_suspended_through_round_number int;
