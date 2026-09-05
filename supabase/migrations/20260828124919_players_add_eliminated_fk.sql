alter table battle_royale.players
  add column eliminated_in_round_id uuid references battle_royale.rounds (id);
