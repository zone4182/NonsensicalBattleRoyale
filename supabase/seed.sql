-- Local dev seed data only. Tokens are known plaintext for curl smoke-testing and must
-- never be used against a real deployed project.
insert into battle_royale.games (id, name, phase, round_interval_minutes, missed_deadline_mode, round1_start_mode)
values ('00000000-0000-0000-0000-000000000001', 'Dev Game', 'setup', 60, 'no_consequence', 'gm_manual');

insert into battle_royale.invites (id, game_id, token, display_name, role)
values
  ('00000000-0000-0000-0000-0000000000a0', '00000000-0000-0000-0000-000000000001', 'dev-gm-token-000', 'Bart', 'gm'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000001', 'dev-player-token-001', 'Alice', 'player'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000001', 'dev-player-token-002', 'Bob', 'player');

insert into battle_royale.game_power_settings (game_id, power_key, enabled)
select '00000000-0000-0000-0000-000000000001', key, default_enabled
from battle_royale.powers_catalogue;
