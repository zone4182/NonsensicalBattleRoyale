# Russian Roulette Endgame

An alternate endgame to Three Doors, selectable per game via `games.endgame_mode`
(`'three_doors'` default, or `'russian_roulette'`). Both endgames are triggered
identically -- the instant exactly 3 players are alive -- and both now sit behind a
shared **Endgame Transition** screen (see below) instead of starting their clock the
moment the phase flips.

This document is the frozen spec for the Russian Roulette mode, kept separate from
`three-doors.md` so the two endgames can be compared later. Not to be confused with a
future Russian-Roulette *mini-game* played mid-round with in-game variables and player
interactions (explicitly out of scope here, deferred).

## Endgame Transition (applies to both endgame modes)

Neither endgame's timer starts the instant the phase flips server-side -- that let the
clock start ticking before a player had even seen the screen. Instead:

1. The moment alive count drops to 3, `games.phase` becomes `'endgame_transition'` and
   `games.endgame_transition_started_at` is stamped.
2. Each of the 3 alive players sees a cinematic (text varies by `endgame_mode`) with a
   Continue button. Clicking it stamps `players.endgame_transition_acked_at`.
3. The instant all 3 have acked, the game immediately transitions into the real
   endgame phase (`'three_doors'` or `'russian_roulette'`) and *that* transition is
   when the real deadline/state gets stamped -- not before.
4. Fallback: if not everyone has acked within `games.endgame_transition_deadline_minutes`
   (default 5), the game starts the real endgame anyway -- an AFK player is treated as
   present but simply hasn't acted, same principle as a missed vote.
5. Bots auto-ack the instant they enter this phase (same "acts instantly" convention as
   every other bot decision -- see `_shared/bots.ts`).

## Setup

- Revolver: 6 chambers, 2 bullets, positions random and hidden.
- Turn order: randomized.
- Needs exactly 2 eliminations to go from 3 players to 1 -- exactly matches the 2
  bullets loaded, so the game is guaranteed to end with exactly one winner.

## Turn resolution

On a player's turn, they pick a target: themselves, or one specific other living
player. The chamber fires at that target with independent probability
`bullets_remaining / 6` (2/6 while both bullets are still in play, 1/6 once one has
been used) -- **the gun is conceptually re-spun before every single trigger pull**, not
a fixed advancing sequence. This was a deliberate choice over the "classic" escalating-
dread version (same bullets staying put, tension rising as chambers get used up
without firing) -- flatter tension, no need to track exact chamber state, just how many
bullets remain in play.

- **Hit**: target dies immediately, no wounding mechanic. `bullets_remaining` drops by
  one. If only 1 player remains, they win -- the manor's doors open for them. Otherwise
  the gun is re-spun and turn order reshuffled for the surviving players.
  - **Other-kill penalty**: the shooter can never go first in the reshuffled order that
    follows this kill -- a soft tactical cost for successfully eliminating someone (the
    other survivor gets to act with more information).
- **Miss**: nothing happens. Turn passes to the next player in the current order.
  - **Other-shot miss penalty**: that specific shooter is forced to target only
    themselves on their *very next individual turn* (not necessarily their next turn
    within this same pass -- the flag persists across a reshuffle if needed, and is
    consumed the moment that player's next turn actually happens).
- **End of a full pass with no hit**: the gun is re-spun and turn order reshuffled
  (fresh pass) -- same "flatter tension" choice as above, not a special case.

## Turn deadline

Each individual turn has a deadline (`games.roulette_turn_deadline_minutes`, default
5). If the active player hasn't acted by then, the fallback is an automatic self-shot
on their behalf -- same "nothing waits forever, but a timeout still has a real in-game
consequence" principle as a missed vote, not a free pass.

## Victory / defeat

Exactly one survivor. No draws, no multi-winner outcomes -- unlike Three Doors, there
is no way for Russian Roulette to end with zero survivors, since eliminations only ever
happen one at a time and the game keeps running turns until exactly one player is left.

## Data model

- `battle_royale.roulette_state` -- one row per game while `phase = 'russian_roulette'`:
  `bullets_remaining` (2 -> 1 -> would-be 0, but the game always ends once alive count
  hits 1, so it never actually needs to reach 0 in a valid game), `turn_order` (jsonb
  array of player ids for the *current* pass), `current_turn_index`,
  `forced_self_only_player_ids` (jsonb array -- see the miss-penalty note above on why
  this needs to support more than one pending flag at once), `current_turn_deadline_at`.
- `battle_royale.roulette_shots` -- append-only log, one row per shot (hit or miss):
  `shooter_player_id`, `target_player_id`, `is_self`, `hit`, `round_number` (which pass
  this shot belongs to, for narration/GM display grouping), `created_at`. Mirrors
  `door_picks`' role for Three Doors -- the GM (and, post-game, everyone via Game
  Stats) can see the full shot-by-shot history.

## Bots

Bots choose uniform-random (self or a random living other), same "no strategy" 
convention as every other bot decision in this app (voting, door picks, room moves).
When every remaining player is a bot, the entire endgame resolves synchronously,
turn-by-turn, within a single `resolve-round`/transition call -- exactly like bots
casting votes or door picks instantly today.
