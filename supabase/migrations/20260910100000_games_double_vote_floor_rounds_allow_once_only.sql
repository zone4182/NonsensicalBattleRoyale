-- -1 is a special sentinel: "each player can hold the double vote at most once per
-- game, ever" (pickDoubleVoteHolder excludes every past holder, not just the last N
-- rounds, and does NOT fall back to the full alive pool once everyone's had a turn --
-- see the comment there). 0 stays disallowed -- not a meaningful value.
alter table battle_royale.games drop constraint games_double_vote_floor_rounds_check;
alter table battle_royale.games
  add constraint games_double_vote_floor_rounds_check
  check (double_vote_floor_rounds = -1 or double_vote_floor_rounds >= 1);
