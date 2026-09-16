-- New phase values for the endgame-transition gate and the Russian Roulette endgame
-- (see concept/mini-games/russian-roulette-endgame.md). Each ALTER TYPE ... ADD VALUE
-- must be its own statement outside any transaction that also uses the new value, so
-- this migration does nothing else.
alter type battle_royale.game_phase add value 'endgame_transition';
alter type battle_royale.game_phase add value 'russian_roulette';
