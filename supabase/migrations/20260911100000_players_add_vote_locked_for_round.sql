-- Lets a player make their own vote definitive early, even when games.allow_vote_change
-- is on -- an explicit opt-out of the "can still change my mind" flexibility for this
-- one round, not a global setting. Plain round_number, same style as the existing
-- vote_suspended_through_round_number -- naturally becomes irrelevant once a new round
-- starts, no explicit clearing needed.
alter table battle_royale.players
  add column vote_locked_for_round_number integer;
