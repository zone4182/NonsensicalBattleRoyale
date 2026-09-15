-- Separates "why a power was granted" from "what happened when it was used". Before
-- this, an earned grant's trigger (e.g. 'near_miss') was stashed in effect_detail --
-- but use-power and resolve-round both overwrite effect_detail wholesale once the
-- power is armed/used, silently destroying the original grant reason. granted_reason
-- is written once at grant time (see grantPower in _shared/powers.ts) and never
-- touched again, so the GM overview can show both facts independently.
alter table battle_royale.power_grants
  add column granted_reason jsonb not null default '{}'::jsonb;
