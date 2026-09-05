alter table battle_royale.games
  add column gm_player_id uuid references battle_royale.players (id);
