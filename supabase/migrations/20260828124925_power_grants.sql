-- granted_by_gm_action_id is added later (20260828124929) once battle_royale.gm_actions
-- exists. effect_detail is jsonb because effect shape varies per power (e.g. Rewind
-- needs a target round id, Swap needs two player ids) — a typed column per power would
-- need a migration per new power/twist, which the design explicitly keeps open-ended.
create table battle_royale.power_grants (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references battle_royale.games (id) on delete cascade,
  round_id uuid references battle_royale.rounds (id),
  power_key text not null references battle_royale.powers_catalogue (key),
  granted_to_player_id uuid not null references battle_royale.players (id),
  acquisition_method battle_royale.power_acquisition_method not null,
  granted_at timestamptz not null default now(),
  used_at timestamptz,
  -- 'pending' | 'resolved' | 'expired' | 'no_effect'
  effect_status text not null default 'pending',
  effect_detail jsonb not null default '{}'::jsonb
);

create index power_grants_game_id_idx on battle_royale.power_grants (game_id);
create index power_grants_granted_to_player_id_idx on battle_royale.power_grants (granted_to_player_id);
