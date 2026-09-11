This is a mini game, which the GM can optionally include to the main game, when setting up the game.

Using the information from the mansion.md, a grid map needs to be build to represent the layout of the mansion for the mini-game. The grid map will help players visualize the different rooms and their locations within the mansion. The actual grid layout for version 1.0 is drafted below, under "Floor plans."

**Visualization -- resolved: pixel-frame grid, not Vuetify.** A plain CSS Grid of
`.pixel-frame` cells (the same bordered-panel style used everywhere else in the app)
laid out to match the mansion's actual floor adjacency, with occupancy represented
as a brightness/opacity step on the existing `--nbr-accent` color token rather than
a full heatmap color scale/component. Reasoning: the rest of the app is a
hand-rolled 90s pixel-arcade style with zero UI framework dependency (no Vuetify
anywhere) -- pulling one in for a single grid would clash visually and add a heavy
dependency for one component. It also avoids a real ambiguity in reusing color for
two different things: mansion.md already gives each room its own *thematic* color
(the Toilet's "dark red scale," the Attic's "yellow scale," etc.), which would
collide visually with using color intensity for *occupancy* too -- those stay two
separate visual channels, not one.

Each floor will have a grid representation, with each room as a cell. Occupancy
(more people in a room = more visually "hot") is shown per the visualization
decision above. The grid also includes labels for each room, making it easy for
players to identify their current location and plan their next move.

When the game starts each player will be in the **Kitchen**, and the interactive
game actually begins from there. (Corrected from an earlier draft that had everyone
starting in the Toilet -- that room is specifically the crime scene per
`mansion.md`, and the Arrival Prologue narrative already has the guests gathering
in/around the kitchen the next morning before the body is found, not starting
inside the murder room itself.)

After each round, players will see all floor charts, with the color representations, but no labels (needs to be secret where each player is), they only see their own name/icon/label in the cell they are in.
Players will have the option to move to a different room, adjacent to the room they are currently in, or stay in the same room.
They can only move 1 space vertically or horizontally, not diagonally -- **with one
exception: staircase cells**, which let a player move between floors instead. See
"Floor plans" below for exactly how that works.
The result all player move will be revealed in the next round, in the updated pixel-frame grid.

## Floor plans

Drafted to be internally consistent with `mansion.md`'s room descriptions and with
how an actual English manor is laid out (entrance/reception rooms up front, service
rooms toward the back, bedrooms above). Only **Ground Floor** and **First Floor**
get real room grids for v1.0, matching `mansion.md`'s own "not accessible to players
in version 1.0" notes for Second Floor, Attic, and Basement. Both real floors share
the exact same 3-column × 2-row footprint on purpose -- see "Staircases" below for
why that matters.

Grid coordinates use column letters (A-C, left to right) and row numbers (1-2, front
to back of house), same convention both floors.

### Ground Floor

| | A | B | C |
|---|---|---|---|
| **1** (front) | Library | **Entrance Hall** (main staircase up) | Living Room |
| **2** (back) | Dining Room | Kitchen (locked door to Basement) | Toilet |

Reasoning: the Entrance Hall sits front-and-center since it's the arrival point and
already holds "a large staircase leading to the upper floors" per `mansion.md` --
reused as this floor's staircase cell rather than inventing a redundant separate
room. Library and Living Room flank it as the two reception/sitting rooms. Dining
Room sits next to Kitchen (service flow), and Toilet is tucked in the back corner,
matching its "cramped downstairs" description. Players start in Kitchen (B2).

### First Floor

| | A | B | C |
|---|---|---|---|
| **1** (front) | Guest Bedroom 1 | **Landing** (staircase down to Entrance Hall) | Master Bedroom |
| **2** (back) | Guest Bedroom 2 | Bathroom | *(no room -- structural space)* |

"Landing" is a new room, not named in `mansion.md` -- the natural English-manor term
for the hallway/platform at the top of a staircase, added specifically to be this
floor's staircase cell. It sits at the same **B1** coordinate as Ground Floor's
Entrance Hall (see "Staircases" below for why). C2 is deliberately left as
non-explorable structural space rather than forcing a fifth bedroom into existence
just to fill the grid -- not every cell in a real floor plan is a room.

### Staircases: how moving between floors actually works

A cell flagged as a staircase cell (Entrance Hall on Ground Floor, Landing on First
Floor) offers a player standing in it **one additional move option** beyond the
normal same-floor adjacent cells: moving to the *matching* staircase cell one floor
up or down. This only works from a staircase cell -- you can't jump floors from an
ordinary room. Both floors deliberately share the same coordinate grid specifically
so their staircase cells land on the same coordinate (**B1** in both cases) and the
connection is spatially obvious, not an arbitrary teleport.

This also sets the rule for whenever Second Floor, Attic, and Basement get built out
for real later:
- **Second Floor**, whenever it exists, needs its own staircase cell at the same
  **B1** coordinate, continuing the same main staircase up from First Floor's
  Landing.
- **Attic** connects differently -- `mansion.md` says it's "only accessed through a
  staircase on the second floor," a *separate* staircase from the main one, not
  necessarily at B1. Its future connector cell should align with wherever that
  second staircase actually sits on the Second Floor grid, not automatically B1.
- **Basement** connects differently again -- not a staircase at all, but "a door in
  the kitchen... currently locked and requires a special key." Its future connector
  cell should align with Ground Floor's **Kitchen (B2)**, and moving there should
  additionally require whatever unlocking mechanic eventually represents finding
  that key -- out of scope for this draft, just flagging where it hooks in.

### Not-yet-built floors still occupy their place in the stack

Second Floor, Attic, and Basement don't have real grids yet, but per your ordering
requirement below they still need to render as inert/greyed placeholder rows in
their correct physical position in the on-screen stack (e.g. "Second Floor -- not
yet available"), rather than being omitted entirely -- so the vertical stack always
reads as a believable full cross-section of the house, even while most of it is
still locked.

## Guessing mechanic

**Decoupled from moving entirely -- this is the fix for the earlier contradiction.**
The original draft gated the guess prompt on "after a player has moved," which
directly conflicted with "moving is entirely optional" (a player who never moves
would also never get to play the guessing half at all). Resolved: guessing is its
own independent action, available to every alive player every round regardless of
whether they moved, stayed, or never opened the Move screen this round.

- **Every round**, each alive player is shown exactly one prompt: *"Where do you
  think {random still-alive player} will end up this round?"* -- a genuine
  prediction, not a lookup. It's asking where that player's move will land them
  once this round resolves, using only what you already knew going into this round
  (the last reveal) -- not something checkable from information you already have.
- **The random target excludes**: the asking player themselves (never asked to
  guess about their own room), the GM (never a room-occupying entity in this
  mini-game), and any ghost (only still-alive players are ever the subject).
- **Target selection is freshly random every round**, independent of past rounds --
  no memory of who you were already asked about before, same "uniform random, no
  extra state to track" convention the rest of this app already uses for things
  like the double-vote holder pick.
- **Exactly one guess per player per round** -- same one-action-per-round rhythm as
  voting and the room move itself, not stackable.
- **Where you can guess is not constrained the way moving is.** Your own move is
  limited to adjacent rooms (see "Floor plans" above), but a guess about someone
  *else* can be any real room on any accessible floor -- they could plausibly have
  moved anywhere adjacent to wherever they started, and you're guessing their
  destination, not confirming a move of your own. The guess UI shows the full
  stacked set of floor grids with every real room selectable, not just adjacent
  ones.
- **Evaluated against wherever the target actually ends up after this round's
  moves resolve** -- whether they moved or stayed in place makes no difference to
  how the guess is checked, it's just their real post-resolution room either way.
- **If the target is eliminated (voted out) in this same round**, the guess still
  evaluates normally against their last-recorded room rather than being voided or
  skipped -- no special-casing needed, their position for this round is still a
  real, checkable fact regardless of what happens to them afterward.
- **No penalty for a wrong guess** -- consistent with this mini-game's own stated
  goal ("stay engaged... try to guess their locations") and with how low-stakes,
  cosmetic-flavor systems already work elsewhere in this app (Seance is explicitly
  "entirely cosmetic... no effect on living game state"). A correct guess earns a
  point; an incorrect one simply doesn't.

**Still genuinely open, not something I resolved here:** what a point is actually
*worth*. `points.md` explicitly leaves the whole points economy undetermined
("possible items or advantages... determined in a next version"). This mini-game
can track its own simple per-player point counter regardless -- incrementing it is
well-defined now -- but what a player can eventually *do* with points earned this
way depends entirely on that still-undecided system, not something to invent
unilaterally here.

## Player UI: the Move screen

When this mini-game is enabled by the GM, every player gets a **Move** button in
their hub (the same area `PlayerSettingsModal`'s Settings button lives in on the
main round screen). Tapping it opens a dedicated screen covering both actions --
moving your own piece and submitting this round's guess -- since a player visits
this screen at most once per round either way:

- **Rules text** at the top -- plain-language explanation of the basic movement
  constraint (move to one adjacent room only, horizontal or vertical, never
  diagonal, or stay put).
- **A separate, explicit instruction block for the staircase mechanic** -- moving
  between floors is a non-obvious exception to the basic rule above, so it gets its
  own callout rather than being buried in the general rules text. Implemented as a
  toggleable show/hide block (collapsed by default, labeled something like "How do
  staircases work?") right below the main rules text, expanding to explain: cells
  marked with a staircase icon let you move to the matching staircase cell on the
  floor above or below, instead of (not in addition to) a normal same-floor move.
- **The floor blueprints, stacked vertically in physical building order** -- one
  grid per floor, rendered top to bottom the way the real building actually stacks:
  Attic (topmost), Second Floor, First Floor, Ground Floor, Basement (bottommost).
  Floors without a real grid yet (Second Floor, Attic, Basement -- see "Floor
  plans" above) still render as an inert/greyed placeholder in their correct
  position, not omitted, so the stack always reads as the whole house. Within
  whichever floor a player is actually on, only rooms adjacent to their current
  room (plus a same-floor staircase cell's cross-floor option, per above) are
  shown as clickable/active -- every other cell on every floor is inert, not a
  dead-end trap for misclicks.
- **Your own position** is marked distinctly (a circle/marker with your own
  name or identifier) on the cell you currently occupy. No other player's position
  is shown anywhere on this screen, consistent with "no labels" above -- this is
  your own private view of the board, not a shared one.
- **Selecting** an adjacent room highlights it, but doesn't move you yet.
- A separate **Confirm move** button commits the selection. Nothing happens until
  that's pressed -- an accidental tap on a room doesn't lock anything in.
- **Moving is entirely optional.** A player can leave this screen (or just never
  open it) without picking anything, equivalent to staying in their current room.
- **Separately, a Guess block** -- shown regardless of whether the player moves
  this round (see "Guessing mechanic" above for why the two are independent):
  *"Where do you think {random still-alive player} will end up this round?"*,
  followed by the same stacked floor grids used for movement, except **every real
  room is selectable here, not just adjacent ones** -- guessing someone else's
  destination isn't limited by your own single-step movement range. Selecting a
  room highlights it; a separate **Submit guess** button commits it, same
  select-then-confirm pattern as the move itself. Also entirely optional --
  skipping it just means no chance at a point this round, nothing else.

## GM Setup integration

Same pattern established in `russian-roulette.md`: opt-in via a general "Enable
mini-games" toggle in GM Setup, with this mini-game getting its own settings block
underneath rather than loose top-level fields.

### Settings block

- **`move_to_room_enabled`** -- off by default, the toggle for this specific
  mini-game's block.
- That's it for GM-configurable fields. Two things that might look like settings on
  first glance are deliberately **not** GM-configurable, resolved below instead of
  turned into extra knobs:

**Cadence isn't a setting -- it's always tied to the main round clock.** A player's
move/guess submission window is open for exactly as long as that round's voting
window is open, and both resolve at the exact moment the round itself resolves
(same `resolve-round` trigger, not a separate timer). Reusing the round
infrastructure that already exists is simpler and more consistent than inventing a
parallel clock, and there's no clear benefit to letting a GM decouple the two.

**End condition isn't a setting either -- it stops automatically when Three Doors
triggers.** Per `three-doors.md`, reaching exactly 3 players already replaces the
entire round loop (voting stops entirely from that point on). Movement/guessing
stopping at the same moment follows the same precedent rather than needing its own
GM-configurable end condition the way Russian Roulette does -- there's no
Russian-Roulette-style ambiguity here to resolve, since "the round loop is still
running" is already an unambiguous, existing signal to key off.

### GM visibility

**Resolved: yes, the GM gets a live, de-anonymized view.** Same principle already
established for votes (`gm-game-overview` reveals full vote attribution the moment
it happens, never withheld from the GM the way it's withheld from other players) and
for Three Doors (the GM's In Play screen shows live door picks). The GM's own screen
should show the same stacked floor grids as players see, except **with real player
name labels on every occupied cell**, not just their own position -- and the running
per-player guess history (who guessed what about whom, correct or not) alongside it.
Nothing about this mini-game's secrecy rule applies to the GM; it only ever hides
positions from other *players*.

### Interaction with other enabled mini-games

No blocking conflict with Russian Roulette, the Imposter, or Assignments today:

- **Russian Roulette elimination mid-round** reuses the exact same resolution
  already defined for a normal vote elimination happening the same round as an
  active guess (see "Guessing mechanic" above) -- evaluate against the player's
  last-recorded room, don't void anything.
- **Imposter and Assignments** are both purely player-identity/objective layers
  with no positional component today -- nothing here reads or writes anything
  either of those systems owns. A future Assignment type referencing room location
  (e.g. "be in the same room as {player} by round N") is a plausible future
  crossover, but that's speculative scope for `the-assignment.md` to pick up later,
  not something to build into this doc now.
