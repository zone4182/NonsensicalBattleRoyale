-- Random Double Vote (GAME-DESIGN.md "Double Vote") was always on, with no way to turn
-- it off -- pickDoubleVoteHolder was called unconditionally for every round. Default
-- true matches every existing game's actual behavior.
alter table battle_royale.games
  add column double_vote_enabled boolean not null default true;
