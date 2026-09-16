-- Stamped when a player clicks Continue on the shared endgame-transition screen (see
-- concept/mini-games/russian-roulette-endgame.md). The real endgame begins the instant
-- every alive role='player' row has this set, or the transition's own deadline passes.
alter table battle_royale.players
  add column endgame_transition_acked_at timestamptz;
