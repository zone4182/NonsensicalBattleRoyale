# The Imposter (optional role)

## Concept

A secret role, layered on top of the normal game exactly the way the Hidden Powers
System is layered on top of it — never mentioned in any player-facing rules or copy,
discovered only by experiencing it. One player (or GM-chosen) is secretly the
Imposter: someone at the gathering with their own private motive to cause harm or
mischief, unrelated to whoever killed Bart. Not a twist on the murder-mystery plot —
a second, smaller one running quietly underneath it.

**Core constraint (non-negotiable): the core loop never changes because this role
exists.** Round structure, voting, resolution, elimination, narration, and the ending
are byte-for-byte identical whether or not an Imposter is in play. The Imposter is
additive flavor + a small curated toolkit, never a rules exception. If a proposed
Imposter ability would need special-casing in vote tallying, round resolution, or the
Three Doors endgame, it's out of scope for this role — that's what the general Powers
System is for.

## GM Setup

- **`imposter_enabled`** — off by default, toggle at game setup (same pattern as
  `double_vote_enabled`).
- **`imposter_assignment_mode`** — when enabled, GM picks one:
  - **Random** — one random alive player, chosen automatically the moment Round 1
    starts (same moment/mechanism as the double-vote holder pick).
  - **GM choice** — the GM manually assigns the role to a specific player, any time
    after invites are redeemed. Logged the same way a power grant is.
- Never assigned to the GM's own player row, never to a bot (bots can't meaningfully
  play a secret objective).

## Secrecy

Identical rule to the Powers System: the Imposter is never told the role exists ahead
of time, and no other player is ever told the role exists at all — living or ghost.
The Imposter themselves is privately notified once, the moment they're assigned
("something else brought you to this house"), and never has to disclose it. It
surfaces for everyone only at the End-of-Game Reveal, alongside the Power Log and GM
Action Log — a new **Imposter Reveal** line: who it was, and (if any) which of their
toolkit they used.

## What the Imposter does NOT get

- No extra votes, no vote-tally influence, no elimination immunity by default. Those
  already exist as ordinary Hidden Powers the Imposter can acquire the same way anyone
  else can (random drop, earn trigger, GM grant) — being the Imposter doesn't grant
  them automatically.
- No separate win condition that ends the game differently. "Last player standing" /
  Three Doors survivor stays the only actual win. Being a "successful" Imposter is
  bragging-rights-only, surfaced at the reveal — same status as the existing
  "secondary, informal goal" of looking good in the reveal (GAME-DESIGN.md
  "Objective"). This keeps the endgame math untouched.
- No ability to unilaterally eliminate someone outside the normal vote. Mischief
  happens through influence, not override.

## Toolkit (starter set — small on purpose)

A short menu of chaos-flavored, one-shot abilities available *only* to whoever holds
the Imposter role this game, on top of (not instead of) whatever ordinary Hidden
Powers they separately acquire:

- **Sow Doubt** — send one anonymous "tip" to a player of their choosing, framed as
  coming from a third party, casting suspicion on someone else. (This is the existing
  catalogue's **False Flag** power, GAME-DESIGN.md flagged it as tone-risk for general
  release — scoping it to just the Imposter, a role players already expect to be
  playing dirty, is a much safer container for it than handing it out at random.)
- **Cover Story** — once per game, if the Imposter is the top vote target, this is
  silently treated as an ordinary near-miss (no mechanical effect beyond what
  near-miss already does) rather than flagged anywhere as suspicious — purely
  narrative cover, changes no numbers.
- Both are one-shot (use once, gone) and logged in full like every other power use —
  full visibility at the reveal, never during play.

Deliberately not doing yet (future scope, don't build): a real secret objective/scoring
system (e.g. "get a specific player eliminated by round N"). `points.md` and
`items-and-advantanges.md` in this same folder are already marked as unfinished
concepts for a reason — bolting a scored side-objective onto the Imposter before that
foundation exists would be the kind of change to the core game this role is explicitly
supposed to avoid. V1 of this role is identity + flavor + a couple of narrative-only
tools, nothing that needs new win-condition plumbing.

## Interaction with Assignments

**Resolved: a player can hold this role and also have a secret Assignment
(`the-assignment.md`) at the same time — the two stay fully independent.** No shared
eligibility check, no combination logic. See that file's own "Interaction with the
Imposter role" section for the full reasoning.

## Data model sketch (not yet implemented)

- `games.imposter_enabled boolean not null default false`
- `games.imposter_assignment_mode text` (`'random' | 'gm_choice'`, nullable unless
  enabled) — same shape as `round1_start_mode`.
- `players.is_imposter boolean not null default false` — same pattern as
  `players.is_bot`: a tag on the existing player row, not a new `role` enum value.
  Keeps every existing query that already filters `role = 'player'` correct by
  construction, since the Imposter is still, in every other respect, an ordinary
  player.
- Imposter's one-shot toolkit usage can likely ride the existing `power_grants` /
  `gm_action` logging shape rather than needing new tables — worth confirming once
  this moves from concept to implementation.

## Open questions

1. Exact wording/framing of the private "you're the Imposter" notification — needs to
   land as ominous-but-not-plot-breaking, consistent with the existing tone
   (playful horror-comedy, GAME-DESIGN.md "Tone").
2. Whether "Cover Story" needs any limit beyond once-per-game (e.g. can't be used two
   rounds in a row) — probably not, but flag if abuse becomes obvious in playtesting.
3. Whether a second toolkit ability should exist beyond these two, or whether two is
   enough for v1 given the "small on purpose" intent above.
