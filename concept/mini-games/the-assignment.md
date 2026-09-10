# Assignments (optional secret missions)

## Concept

A random secret personal goal, privately handed to a player (or several, or
everyone) at the start of the game: a small, private reason to push for a specific
outcome in who gets voted out, and when. Examples:

- *"Make sure {Player X} is voted out before {Player Y}."*
- *"Make sure {Player X} is voted out before round {N}."*

Like the Imposter role (see `the-imposter.md`) and the Hidden Powers System, this is
additive flavor layered on top of the existing loop, not a rules change. A player
achieves their assignment purely through ordinary play — lobbying, scheming,
voting — all of which already happens out-of-app (GAME-DESIGN.md "Communication").
Assignments give that scheming a private *reason*; they don't add any new way to
actually force an outcome. Success or failure is just a fact the system can already
determine from elimination order and round numbers — it's observed, not enforced.

**Core constraint (same as the Imposter's): the core loop never changes because
assignments exist.** No new votes, no tally influence, no elimination override. An
assignment is a sentence a player privately carries around, and a checkmark the
system quietly resolves once the outcome it referenced becomes knowable (either the
target is eliminated one way or another, or the game ends). Nothing about voting,
resolution, or the endgame reads assignment state to decide anything.

## GM Setup

- **`assignments_enabled`** — off by default, toggle at game setup (same pattern as
  `double_vote_enabled` / `imposter_enabled`).
- **`assignment_coverage`** — when enabled, GM picks one:
  - **Some** — a random subset of players get an assignment (GM sets how many).
  - **All** — every player gets one.
- Never assigned to the GM's own player row, never to a bot (same reasoning as the
  Imposter — a bot can't meaningfully pursue a private objective).
- Delivered privately the moment Round 1 starts, alongside the double-vote-holder and
  Imposter notifications if those are also enabled — one more thing that may or may
  not be sitting in a given player's private status, same "never obligated to
  disclose" rule as Double Vote.

## Assignment types (v1 — the two requested, kept deliberately simple)

1. **Eliminate-before-player** — *"Make sure {X} is voted out before {Y}."*
   Succeeds if X's elimination round number is lower than Y's (or X is eliminated and
   Y survives to the end). Fails if Y is eliminated first, or if the game ends with
   neither eliminated, or with Y eliminated and X not.
2. **Eliminate-before-round** — *"Make sure {X} is voted out before round {N}."*
   Succeeds if X is eliminated in a round with round_number < N. Fails if X is still
   alive once round N resolves, or the game ends earlier with X still alive.

Both `X` (and `Y`, for type 1) are picked at random from the alive roster at
assignment time, excluding the assignee themselves. Resolution doesn't care whether
the assignee is later eliminated — an eliminated player's assignment keeps tracking
in the background and can still succeed or fail from the sidelines, same as a ghost
can still hold a Hidden Power's earned trigger conditions in motion. This keeps it a
"did the world go the way you hoped" bragging-rights item rather than something that
requires the assignee to still be actively playing.

### Picking a fair round number for type 2

`N` shouldn't be trivial (round 1 — no time to do anything) or unreachable (a round
number the game can't realistically get to before Three Doors triggers at 3 players
remaining, GAME-DESIGN.md "Endgame"). Pick `N` at random from a range anchored to the
current alive player count at assignment time — roughly between round 2 and
`alive_player_count - 3` (the max number of ordinary elimination rounds before Three
Doors takes over), same grounding MIN_PLAYERS_TO_START/Three Doors already give the
rest of the game's pacing. Exact bounds are an implementation detail, not a design
question — the point is "plausible, not guaranteed, not impossible."

## Reward & Punishment (decision pending)

**Reversed from the earlier draft: an assignment needs a real stake, or there's no
reason to actually pursue one over just playing normally.** Bragging-rights-only at
the reveal isn't enough on its own — noted below, but not the whole answer anymore.
Exact mechanism is still undecided; this section is candidates, not a spec.

This is the one place assignments are allowed to touch the core game a little — but
the consequence should land **after** resolution, not change **how** an outcome is
reached. The pursuit stays exactly as described above (lobbying/scheming only, no new
way to force a vote); only what happens once success/failure is already determined is
up for grabs here.

**Reward candidates (on success):**
- Grant a Hidden Power immediately — either random (reusing the existing "earned
  trigger" acquisition method, `evaluateEarnTriggers`, as a new trigger type
  alongside near-miss/ghost-mode/survival-streak/etc.) or a fixed, predictable one
  (e.g. always Ward) for consistency instead of luck-on-luck.
- Purely cosmetic reveal flair (highlighted entry, distinct wording) — safest, but
  weakest as an actual incentive to try.

**Punishment candidates (on failure):**
- Vote suspended for the next round — reuses the exact same mechanism
  `missed_deadline_mode`'s "one-round penalty" already uses
  (`vote_suspended_through_round_number`), no new plumbing needed.
- Forfeit any currently-held Hidden Powers (unused `power_grants` revoked).
- Nothing mechanical, reputational only (the failure already shows at the reveal
  regardless of what else happens) — weakest option, listed for completeness.

**Balance risk to keep in mind when deciding:** a reward risks snowballing (the
player already doing well gets stronger), and a punishment risks feeling arbitrary
for a target picked at random rather than earned by the assignee's own mistake —
worth weighing before landing on one, not something to decide by default.

## Secrecy

Same rule as the Imposter and the Powers System: no player-facing copy or UI ever
hints that assignments exist ahead of time. An assignee is told their own assignment
once, privately, and only ever sees it — never anyone else's, never whether anyone
else has one at all.

## Data model sketch (not yet implemented)

- `games.assignments_enabled boolean not null default false`
- `games.assignment_coverage text` (`'some' | 'all'`, nullable unless enabled)
- `games.assignment_count int` — used only when coverage is `'some'`; how many
  players get one.
- New table `player_assignments`:
  - `id`, `game_id`, `player_id` (the assignee)
  - `assignment_type` (`'eliminate_before_player' | 'eliminate_before_round'`)
  - `target_player_id` — the "X" in both types
  - `comparison_player_id` — the "Y", only for `eliminate_before_player`
  - `target_round_number` — only for `eliminate_before_round`
  - `outcome` (`'pending' | 'succeeded' | 'failed'`), `resolved_at`
  - `created_at`
- Resolution can most likely piggyback on the same moment `resolve-round` already
  updates `rounds.eliminated_player_id` — re-check any `pending` assignment whose
  referenced player(s) just changed status, same shape as the existing earn-trigger
  evaluation (`evaluateEarnTriggers`) already does for Hidden Powers. Worth confirming
  once this moves from concept to implementation.

## Interaction with the Imposter role

**Resolved: a player can hold both an assignment and the Imposter role at the same
time — and the two systems stay fully independent.** Assignment eligibility/target
selection doesn't check `is_imposter` either way, and the Imposter's toolkit doesn't
read or affect assignment state. They just happen to both be true of the same person
sometimes, the same way a player can independently hold a Hidden Power and be the
double-vote holder in the same round. No shared code path, no special-cased
combination logic, no "can't have both" rule to enforce anywhere.

## Open questions

1. **Which reward/punishment, exactly** — see candidates above. Still undecided.
2. `assignment_count` for "Some" coverage — sensible default, and any floor/ceiling
   relative to player count?
3. Whether a third assignment type is worth adding later (e.g. "survive longer than
   {X}", framed relative to the assignee rather than two other players) — not
   included in v1 since only the two requested types are drafted here.
4. Same GM-curation question as the Imposter's open questions: random-only for v1, or
   should the GM be able to hand-write a specific assignment for a specific player?
