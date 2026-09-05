alter table battle_royale.power_grants
  add column granted_by_gm_action_id uuid references battle_royale.gm_actions (id);
