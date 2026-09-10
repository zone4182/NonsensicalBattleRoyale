// Game-wide rule constants (GAME-DESIGN.md "Scale") -- not per-game config, so they
// don't live in the `games` table alongside things like round_interval_minutes.

// Three Doors triggers at exactly 3 players remaining; below 5 starting players there
// isn't enough room for a real elimination loop before endgame kicks in, and with so
// few voters anonymity stops holding up in practice.
export const MIN_PLAYERS_TO_START = 5;

// Keeps round_interval_minutes above the resolve-round automatic-mode cron's own
// polling interval (every 5 minutes, see the schedule_resolve_round_cron migrations) --
// a shorter round than that would routinely miss its own deadline check.
export const MIN_ROUND_INTERVAL_MINUTES = 10;

// send-notifications' deadline reminder fires once a round's remaining voting time
// drops to this fraction of its total window (opens_at to voting_deadline_at).
export const DEADLINE_REMINDER_FRACTION = 0.1;
