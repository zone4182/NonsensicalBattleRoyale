-- DB-level backstop matching create-game's requireIntAtLeast(MIN_ROUND_INTERVAL_MINUTES)
-- check -- a round shorter than the resolve-round automatic-mode cron's own 5-minute
-- polling interval would routinely miss its own deadline check.
alter table battle_royale.games drop constraint games_round_interval_minutes_check;
alter table battle_royale.games add constraint games_round_interval_minutes_check check (round_interval_minutes >= 10);
