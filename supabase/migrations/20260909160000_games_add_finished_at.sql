-- GM-triggered administrative closure, independent of game.phase -- distinct from the
-- natural game-end (phase 'ended' via elimination or Three Doors): this is the GM
-- explicitly declaring they're done with this game, whether it concluded naturally or
-- they're abandoning it early. No historical/archive view of a finished game yet --
-- deliberately deferred, per the user.
alter table battle_royale.games
  add column finished_at timestamptz;
