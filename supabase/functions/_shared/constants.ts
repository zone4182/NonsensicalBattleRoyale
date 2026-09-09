// Game-wide rule constants (GAME-DESIGN.md "Scale") -- not per-game config, so they
// don't live in the `games` table alongside things like round_interval_minutes.

// Three Doors triggers at exactly 3 players remaining; below 5 starting players there
// isn't enough room for a real elimination loop before endgame kicks in, and with so
// few voters anonymity stops holding up in practice.
export const MIN_PLAYERS_TO_START = 5;
