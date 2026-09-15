-- GM-configurable per-power/per-game toggle for whether bots are allowed to receive
-- this power at all (random drop or earned trigger) -- separate from `enabled`, which
-- gates the power for everyone. Defaults to true so existing games (and any power not
-- explicitly overridden at setup) behave exactly as before this migration.
alter table battle_royale.game_power_settings
  add column bot_eligible boolean not null default true;
