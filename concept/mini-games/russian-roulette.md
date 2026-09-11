# Russian Roulette (mini-game concept)

Not implemented yet — this is a design writeup, not a description of built behavior
(compare `three-doors.md`, which documents something actually shipped). Originally
referenced as a throwaway line in `items-and-advantanges.md` ("Gun with one bullet...
Concept needs to be finished") — this is that concept, finished, as its own
standalone mini-game rather than tied to a specific item.

## Concept

A revolver with a fixed 6-chamber cylinder. Some number of those chambers are
secretly loaded. A randomly-ordered group of players take turns pulling the trigger,
one turn each per pass around the group. **Firing into a loaded chamber eliminates
that player from the main game** — a real elimination, exactly like being voted out,
not a side-effect or points penalty. This means Russian Roulette is a second real
elimination path alongside the normal anonymous vote, not just flavor sitting next
to it.

## Setup (GM-configurable)

- **Player count**: 2-6. The upper bound isn't arbitrary -- it's exactly the cylinder
  size, so "everyone gets one turn" always fits within a single lap of an unreloaded
  cylinder with no wraparound needed.
- **Bullets loaded**: 1-6, out of the 6 chambers. Positions chosen at random and
  never revealed in advance. Exact GM-setup UI/mechanism is undecided (see Open
  Questions) -- functionally just a number, same shape as e.g.
  `double_vote_floor_rounds` in the main game's GM setup.
- **Cylinder reset mode** -- how often the loaded-chamber positions get re-rolled:
  1. **Never resets** -- one random arrangement for the entire session. The cylinder
     pointer just keeps advancing, lap after lap if there are multiple, the same
     revolver never re-spun. Closest to the "no re-spin" version of the real game.
  2. **Resets every complete round** -- a fresh random arrangement (same bullet
     count) at the start of each new lap through the player order.
  3. **Resets every pull** -- a fresh random arrangement before every single turn.
     Closest to the "spin before every shot" version. Reduces every pull to an
     independent `bullets / 6` chance, with zero memory of any previous pull.
- **End condition**, one of three (see below).

## Turn order

The player order is randomized once, at the start of the mini-game, and stays fixed
for its entire duration (see Open Questions if per-lap re-randomization is wanted
instead). A "round" is one full lap through that order -- everyone still in it takes
exactly one turn. If the end condition needs more than one lap, the same order
repeats, skipping anyone already eliminated.

## How far a session can run

This now depends on the reset mode, not just the end condition:

- **Never resets**: bounded. There are only 6 physical chambers and no reload in
  scope, so **no session can exceed 6 total turns**, full stop, regardless of end
  condition or player count.
- **Resets every round / every pull**: **no fixed ceiling**. Each fresh arrangement
  is an independent random draw, so in principle a session could run for a long
  time (vanishingly likely in practice, but not mathematically bounded the way
  "never resets" is). Worth knowing before picking this mode for a game with a real
  time budget.

## End condition (GM picks one)

1. **First death** -- keep going, lap after lap if needed, until someone fires into
   a loaded chamber. Stops immediately, even mid-lap.
2. **One complete round** -- exactly one lap, no more. Everyone still in it takes
   their turn regardless of what happens partway through -- if bullets > 1, more
   than one player can be eliminated in this single lap. Deterministic length:
   exactly `player_count` turns. (Cylinder reset mode has no observable effect under
   this end condition, since there's never a second round for it to matter in.)
3. **All bullets used** -- keeps going until every loaded chamber has actually been
   fired. **Only cleanly well-defined under "never resets"** -- see the interaction
   note right below.

## Reset mode × end condition: the one real interaction problem

"All bullets used" means "every chamber that was loaded at setup has now been
fired." That's a clean, fixed target under **never-resets** (one arrangement for the
whole session). It stops making clean sense the moment the arrangement itself keeps
changing:

- Under **resets every round**, each round gets a fresh random set of loaded
  chambers -- there's no single persistent pool of "the bullets" to exhaust across
  rounds anymore. Does "all bullets used" then mean "every round must reveal all of
  that round's loaded chambers before moving on," or something else entirely?
- Under **resets every pull**, this breaks down even further -- there's no
  persistent arrangement at all to exhaust.

**Resolved: this is a GM Setup UI problem, not a runtime one.** The setup screen
itself must not let a GM save a conflicting combination in the first place -- pick
"all bullets used" and the resetting cylinder modes should grey out/become
unselectable (or the reverse: pick a resetting mode and "all bullets used" becomes
unselectable), same direction either way. No redefinition of what "all bullets used"
means under a resetting cylinder -- the invalid combination simply can't be
configured. See "GM Setup integration" below for where this behavior actually lives.

## Consequences of "losing eliminates you from the main game"

A few things this decision pulls in that aren't resolved yet (see Open Questions):

- Does an elimination here produce the same `alive -> ghost` status transition as a
  normal vote elimination, narrated the same way? Presumably yes, but not designed.
- If this drops the alive player count to exactly 3 mid-session, does it trigger
  Three Doors the same way a normal round resolving does? Three Doors' trigger
  today lives entirely inside `resolve-round` (see `three-doors.md`) -- a second
  elimination path would need its own hook into that same check.
- Does this run *instead of* a normal round, *between* rounds, or as a GM-triggered
  side event independent of the round clock? Not decided (see Open Questions #3,
  now higher-stakes given real eliminations are on the line).

## GM Setup integration

Mini-games are opt-in at the game level, same pattern as every other optional system
in GM Setup (Random Double Vote, Bot Mode, the not-yet-built Imposter/Assignments):

- A general **"Enable mini-games"** toggle in GM Setup. Off by default, doesn't
  clutter setup for a GM who just wants the core game.
- Once enabled, **each available mini-game gets its own settings block** underneath
  -- Russian Roulette's block holds player count, bullets, cylinder reset mode, and
  end condition. Other mini-games that eventually get built (the room-guessing game
  in `move-to-room-and-guess-random-appointed-guest.md`, etc.) would each get their
  own block the same way, not a shared/generic one.
- **Russian Roulette's block specifically must enforce the reset-mode/end-condition
  conflict at the UI level** -- selecting one of the two conflicting options
  disables/hides the incompatible choice in the other control, rather than allowing
  an invalid combination to be saved and only failing (or silently guessing) later.
  This is the general pattern any future mini-game settings block with similar
  cross-field conflicts should follow too, not something special-cased just here.

## Data model sketch (not yet implemented)

Structurally this is closer to Three Doors than to the normal round loop -- a
separate, self-contained mini-event, not a round variant:

- A `russian_roulette_sessions` row per mini-game instance: `game_id`,
  `bullet_count`, `cylinder_reset_mode` (`'never' | 'per_round' | 'per_pull'`),
  `end_condition`, `player_order` (ordered list of player ids), `cylinder_position`
  (meaningless/unused once reset mode isn't `'never'`), `loaded_chamber_positions`
  (the current secret set -- re-rolled per the reset mode), `started_at`, `ended_at`.
- A `russian_roulette_turns` row per pull: session id, player id, chamber position
  fired, `was_loaded` boolean, `turn_number`, `fired_at`.
- Same secrecy shape as Three Doors' `three_doors_winning_door`: loaded positions
  are known server-side from the start (or from each reset) but never returned by
  any API response before each individual chamber is actually fired.
- An elimination from `was_loaded = true` should reuse whatever the normal
  vote-elimination path already does to a player's status, rather than duplicating
  that logic here.

## Open questions

1. Is the player order randomized once for the whole session (assumed above), or
   re-randomized for every new lap/round?
2. How does a player actually get into a session -- self-selected (like the old
   item-triggered version in `items-and-advantanges.md`), GM-triggered, something
   else? Not addressed at all yet, and now more important given real eliminations
   are at stake.
3. When does a session happen relative to the normal round clock -- instead of a
   round, between rounds, or fully independent/GM-triggered on demand?
4. ~~Whether "all bullets used" should simply be disallowed alongside the two
   resetting cylinder modes.~~ **Resolved** -- see "Reset mode × end condition" and
   "GM Setup integration" above: disallowed at the setup UI level.
5. Exact GM-setup UI widget types (dropdown vs. radio, etc.) for bullet count and
   reset mode still undecided -- but now scoped to living inside Russian Roulette's
   own settings block under a general "Enable mini-games" toggle (see "GM Setup
   integration" above), same open-ended level of detail as `the-assignment.md` and
   `the-imposter.md`'s still-open reward/assignment-mode questions.
6. Whether players are told the bullet count / reset mode in advance, or whether
   that's part of the tension (mirrors Three Doors' "all doors labeled Exit"
   secrecy-by-design choice).
7. Three Doors integration if this elimination path drops the alive count to
   exactly 3 mid-session (see "Consequences" above).
