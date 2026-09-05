-- Configurable N for the two consecutive-round earn triggers (survival-streak,
-- underdog-run; game-design v0.9 §8.4). Both share this one threshold rather than
-- separate columns -- the design doc gives no reason to tune them independently.
alter table battle_royale.games
  add column survival_streak_threshold int not null default 3 check (survival_streak_threshold > 0);
