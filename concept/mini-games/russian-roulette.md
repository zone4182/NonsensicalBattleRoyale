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

**Resolved: player count/selection is never a pre-game setting -- it can't be.** A
session only ever involves *currently alive* players at the moment it's triggered,
and (per "How a session actually starts" below) sessions happen mid-game, on
demand, after players may already have been eliminated by normal voting. Picking
"2-6 players" before the game has even started would mean picking people who might
not survive to the moment a session actually runs. Selection happens live, at
trigger time, from whoever's alive then -- see below. The 6-chamber-cylinder
reasoning for the 2-6 range still holds, it's just enforced at trigger time instead
of at game setup.

What's left as genuinely pre-game configuration -- sensible **defaults** a GM sets
once so they don't have to re-enter them every time they trigger a session, though
nothing stops overriding them per-session at trigger time if a later session in the
same game calls for something different:

- **Bullets loaded (default)**: 1-6, out of the 6 chambers. Positions chosen at
  random per session and never revealed in advance. Exact GM-setup UI/mechanism is
  undecided (see Open Questions) -- functionally just a number, same shape as e.g.
  `double_vote_floor_rounds` in the main game's GM setup.
- **Cylinder reset mode (default)** -- how often the loaded-chamber positions get
  re-rolled:
  1. **Never resets** -- one random arrangement for the entire session. The cylinder
     pointer just keeps advancing, lap after lap if there are multiple, the same
     revolver never re-spun. Closest to the "no re-spin" version of the real game.
  2. **Resets every complete round** -- a fresh random arrangement (same bullet
     count) at the start of each new lap through the player order.
  3. **Resets every pull** -- a fresh random arrangement before every single turn.
     Closest to the "spin before every shot" version. Reduces every pull to an
     independent `bullets / 6` chance, with zero memory of any previous pull.
- **End condition (default)**, one of three (see below).

## How a session actually starts

**Resolves Open Questions #2 and #3 below.** Russian Roulette is fundamentally
episodic, not continuous the way voting or Move-to-Room are -- it only ever involves
a subset of the alive roster (2-6), not everyone, so it can't just be tied to the
round clock the same way a mechanic every player participates in every round can be.

- **GM-triggered on demand, not self-selected by players.** Matches the existing
  "Human GM retains discretionary authority... can trigger mid-game twists, no
  category off-limits" stance (GAME-DESIGN.md "Human GM Capabilities") -- this is
  exactly that kind of twist, not a standing option players opt into themselves the
  way the old item-triggered version in `items-and-advantanges.md` worked.
- The GM picks which 2-6 currently-alive players participate, confirms (or
  overrides) the bullets/reset-mode/end-condition defaults for this specific
  session, and starts it.
- **Fully decoupled from the round clock -- a side event, not a round variant.**
  Doesn't pause, block, or wait for the currently open round's voting window; can
  be triggered between rounds, or run alongside an open round without interfering
  with it. This is *why* player count/settings had to move to trigger-time above --
  a session's context (who's still alive, how far into the game it is) is only
  known at the moment the GM actually decides to run one.

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

- ~~Does an elimination here produce the same `alive -> ghost` status transition as
  a normal vote elimination, narrated the same way?~~ **Resolved** -- see "The
  elimination hook" below.
- ~~If this drops the alive player count to exactly 3 mid-session, does it trigger
  Three Doors the same way a normal round resolving does?~~ **Resolved** -- see
  "The elimination hook" below.
- ~~Does this run instead of a normal round, between rounds, or as a GM-triggered
  side event independent of the round clock?~~ **Resolved** -- see "How a session
  actually starts" above: a GM-triggered side event, fully independent of the round
  clock.

## The elimination hook

**Resolves Open Question #7 below.** Three Doors' trigger today lives entirely
inside `resolve-round` -- it's the last step of resolving a normal round's votes:
tally, eliminate, check `aliveCountAfter`, and if it's exactly 3, flip to
`three_doors` and pick the secret winning door (see `three-doors.md`). Russian
Roulette needs to reach that same "check the resulting alive count and transition
the game phase if needed" behavior without going through any of the vote-specific
machinery around it.

**Resolved: that check gets pulled out into its own shared step, callable by any
elimination path, not just `resolve-round`'s.** Concretely, once Russian Roulette
marks a player `alive -> ghost` for a lost pull, it runs the exact same
post-elimination phase check `resolve-round` already does:

- **Alive count drops to 1 or 0** -- game ends (`phase = 'ended'`), same as a normal
  round hitting this outcome.
- **Alive count is exactly 3** -- flips to `phase = 'three_doors'`, picks the
  secret winning door the same random way, and runs the same bot-auto-pick step for
  whichever of the 3 remaining happen to be bots. From the game's perspective,
  it doesn't matter *how* the count reached 3 -- a vote elimination and a Russian
  Roulette elimination both end up in exactly the same place afterward.
- **Anything else** -- nothing special happens; the game (and any currently open
  round) just continues.

**What it deliberately does *not* reuse**, because none of it makes sense for a
non-vote elimination: vote tallying, tie-break resolution, Ward/Deflect/Null
(vote-defensive powers with nothing to defend against here), missed-deadline
forfeits, or the vote-pattern earn triggers (near-miss, ghost-mode, survival
streak, etc. -- all specifically about voting behavior, not applicable to losing a
pull). The only things a Russian Roulette elimination shares with a vote
elimination are: the `alive -> ghost` status change itself, a narration log entry
(same "the story so far" feed every other elimination writes to, worded for this
cause of death rather than a vote outcome), and the shared phase-check above.

**The race condition this creates, now explicit:** since a session runs
independently of the round clock (see "How a session actually starts" above), it's
possible for a Russian Roulette elimination to hit the "alive count is exactly 3"
case *while a normal round is still open and mid-vote*. Resolved the same way
`three-doors.md` already establishes for the normal path: entering `three_doors`
phase means voting stops entirely from that point on, full stop -- an open round
that happens to still be sitting there doesn't need any special cancellation or
cleanup, it simply stops mattering. Nothing ever resolves it (the GM/player UI
moves on to the Three Doors screen instead of the vote screen), and no votes
already cast in it need to be discarded or refunded, since they were never going to
be tallied for anything once the phase moved on.

## GM Setup integration

Mini-games are opt-in at the game level, same pattern as every other optional system
in GM Setup (Random Double Vote, Bot Mode, the not-yet-built Imposter/Assignments):

- A general **"Enable mini-games"** toggle in GM Setup. Off by default, doesn't
  clutter setup for a GM who just wants the core game.
- Once enabled, **each available mini-game gets its own settings block**
  underneath -- Russian Roulette's pre-game block holds just the
  `russian_roulette_enabled` toggle plus the bullets/reset-mode/end-condition
  *defaults* (see "Setup" above -- player count is deliberately **not** in this
  pre-game block, since it can only ever be chosen live when a session actually
  starts). Other mini-games that eventually get built (the room-guessing game in
  `move-to-room-and-guess-random-appointed-guest.md`, etc.) would each get their
  own block the same way, not a shared/generic one.
- **Triggering an actual session is a separate, in-play GM action** (see "How a
  session actually starts" above), not part of this pre-game setup screen at all --
  it's something the GM does mid-game from wherever they administer the live game
  (alongside things like granting a power or logging a tie-break), picking
  participants from the currently-alive roster and confirming or overriding that
  session's settings there.
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
- An elimination from `was_loaded = true` reuses the normal vote-elimination path's
  status change, narration entry, and phase-transition check -- see "The
  elimination hook" above for exactly what's shared and what isn't.

## Open questions

1. Is the player order randomized once for the whole session (assumed above), or
   re-randomized for every new lap/round?
2. ~~How does a player actually get into a session.~~ **Resolved** -- see "How a
   session actually starts" above: GM-triggered on demand, picking from
   currently-alive players, not self-selected.
3. ~~When does a session happen relative to the normal round clock.~~ **Resolved**
   -- see "How a session actually starts" above: fully decoupled, a side event that
   never blocks or waits on the round clock.
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
7. ~~Three Doors integration if this elimination path drops the alive count to
   exactly 3 mid-session.~~ **Resolved** -- see "The elimination hook" above: the
   phase-transition check is shared between both elimination paths, and the
   mid-open-round race condition is resolved the same way `three-doors.md` already
   handles voting stopping entirely once that phase is entered.
