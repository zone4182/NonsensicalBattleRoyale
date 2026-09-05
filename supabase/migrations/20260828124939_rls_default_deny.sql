-- Defense-in-depth backstop, not the primary access control (ARCHITECTURE.md
-- "Critical architectural rule"). Edge Functions connect with the service-role
-- credential, which bypasses RLS entirely, so game logic is unaffected. This exists
-- purely so that if the anon/authenticated keys were ever accidentally exposed against
-- this schema, every table fails closed by default -- no policies are created here or
-- expected to be added later, least of all for battle_royale.votes.
alter table battle_royale.games enable row level security;
alter table battle_royale.invites enable row level security;
alter table battle_royale.players enable row level security;
alter table battle_royale.rounds enable row level security;
-- battle_royale.votes already enabled in 20260828124921_votes.sql.
alter table battle_royale.powers_catalogue enable row level security;
alter table battle_royale.game_power_settings enable row level security;
alter table battle_royale.power_grants enable row level security;
alter table battle_royale.gm_actions enable row level security;
alter table battle_royale.seance_votes enable row level security;
alter table battle_royale.narration_log enable row level security;
alter table battle_royale.helpline_messages enable row level security;
alter table battle_royale.door_picks enable row level security;
