# Three Doors

The game's only endgame mechanic — fully built and working, unlike most of the other
files in this folder. This describes what's actually implemented
(`resolve-round`/`resolve-doors`/`submit-door-pick`), not a proposal.

## When it triggers

The moment a normal round resolves and exactly **3 players remain alive**. Normal
voting stops entirely from that point on — Three Doors replaces the round loop, it
isn't a variant of it. (GAME-DESIGN.md "Endgame: The Three Doors.")

## The one real secret: a single correct door

The instant the game enters this phase, one door — 1, 2, or 3 — is chosen at random
as the actual way out. This happens server-side in the same transaction that flips
the phase (`resolve-round`), stored in `games.three_doors_winning_door`, and it is
**never returned by any API response before resolution** — not to players, not to
the GM. All three doors are labeled "Exit" in the UI for exactly this reason: there's
genuinely no way to tell them apart in advance.

## What each of the 3 remaining players does

Privately picks a door — 1, 2, or 3 (`submit-door-pick`). No visibility into what
anyone else has picked, or whether they've picked yet at all, until it resolves.

## Resolution (`resolve-doors`)

Runs once all 3 remaining players have picked — either the GM clicking "Resolve
doors," or the background cron sweep. Two outcomes:

- **Any collision** — two players pick the same door, or all three do — **everyone
  loses**. Marked `lose_all` for all three picks. Which door was actually correct
  never even gets checked in this case; a collision is fatal regardless.
- **All three picks unique** — each pick is compared against the secretly-chosen
  correct door. Whoever picked it gets `win`; the other two get `lose`. Exactly one
  sole survivor — matching GAME-DESIGN.md's original wording for this case, which an
  earlier version of this implementation had gotten wrong (it used to mark all three
  as winners on any unique-picks outcome; fixed).

Either way, the game's phase becomes `ended` once this resolves.

## Bots

If any of the exactly-3 remaining players are bots, they pick immediately and
automatically the moment the phase begins — a uniform random door, same as their
normal voting behavior (`castBotDoorPicks`). Otherwise a bot reaching the final 3
would deadlock the game waiting for a pick that never comes.

## Data model

- `games.three_doors_winning_door` — smallint, 1-3, `null` until this phase starts.
- `door_picks` — one row per player: `door_number`, and `resolved_outcome`
  (`'win' | 'lose' | 'lose_all'`, `null` while still pending).

## Rough edges / not built yet

- **No timeout.** Unlike normal rounds (which have a voting deadline), Three Doors
  waits indefinitely for all 3 picks with no fallback — if one of the three never
  picks, the game simply never resolves. There's no GM override to force it either.
- **No reveal yet.** The End-of-Game Reveal screen (`EndGameRevealView.vue`) is still
  a placeholder — it doesn't yet show the winning door, who picked what, or how the
  whole game's votes played out. The GM can see the door picks and outcomes live on
  the In Play screen; players currently can't see any of this after the fact.
