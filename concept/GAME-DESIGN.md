<!--
  CONTEXT FILE FOR AI CODING ASSISTANTS (e.g. Claude Code)

  This file defines the GAME DESIGN for this project — not the technical
  architecture. Treat it as the source of truth for game rules, mechanics,
  terminology, and intended behavior when implementing or discussing features.

  Status: v0.9 — design is locked for most sections; anything under
  "Open Questions" (near the end) is NOT yet finalized and should be flagged
  back to the user rather than assumed when it affects an implementation
  decision. A technical specification (stack, data model, architecture)
  does not exist yet as of this version and should not be inferred from
  this document.
-->

# Battle Royale — Game Design (v0.9)

A social deduction / survival game, originally a manually-run WhatsApp group game, being rebuilt as a standalone app (Vue 3, PWA-first, with a native iOS/Android path planned later). Presentation direction is intentionally old-school/text-driven — terminal/BBS-like narration rather than heavily illustrated UI.

## Concept

Players wake up in a house; the friend who was meant to run their gathering — **Bart, the Game Master** — is dead. His ghost still runs the game via an automated system speaking in his voice. Each round, players anonymously vote to eliminate one person. Eliminated players become non-participating ghosts/spectators (with one cosmetic exception — see Seance, below). Hidden throughout the game are secret powers that are never explained in the rules — players only discover the system exists by experiencing it.

Tone: playful horror-comedy. Stakes are entirely social — bragging rights and a dramatic reveal, never anything real.

## Objective

Be the last player standing, or one of the survivors who wins the endgame ("Three Doors," see below). A secondary, informal goal is coming out of the end-of-game reveal looking good, since all votes and power usage are eventually made public.

## Scale

**Minimum 5 players** (excluding the GM) — enforced: round 1 cannot start below this floor. Below 5, there isn't enough room for a real elimination loop before Three Doors triggers (at exactly 3 remaining), and anonymity stops holding up in practice with so few voters.

**Maximum 20 players** (excluding the GM) for the current version. Not yet a hard restriction in code — a design ceiling to build toward, not an enforced cap.

This affects: the End-of-Game Vote Tree UI (needs to scale/collapse, not just render flat), setup/invite flows, and power/pacing balance across the 5–20 range.

## Onboarding & Invite Flow

Starting a game is the first act of the story, not a signup screen.

- Invites are **unique per person** (email or WhatsApp), tied to the invitee's identity — enables showing real guest names and lets the GM know exactly who's accepted. Invite copy is in-fiction (invitation to a gathering at a house) but carries the real GM's actual name so it reads as legitimate, not spam.
- Opening the invite triggers a **personal, asynchronous arrival prologue** for that player.
- A **fixed, non-interactive sequence** reveals the Game Master's death as part of/after arrival. No choices during this sequence.
- The **player roster reveals progressively** as each player accepts/arrives — not all at once. This is mechanical, not just flavor: it deliberately supports players not knowing the full guest list up front, meant to spill into real out-of-band conversation ("did you get invited too?").
- **Round 1's start trigger is configurable per game**, GM picks one at setup:
  1. Wait until everyone invited has accepted.
  2. GM manually starts whenever ready.
  3. Auto-start at a scheduled date/time regardless of stragglers.

No-show resolution: a player who hasn't accepted when Round 1 starts (modes 2/3) is excluded from that game entirely, as if never invited — not entered as a ghost.

## Core Loop (per round)

1. **Open phase** — players discuss/scheme via any channel of their choosing. The app does not mediate this; it is out of scope.
2. **Voting window** — each active player privately submits one vote (more if they hold vote-granting powers) before a configurable deadline.
3. **Resolution** — system tallies votes, applies powers, eliminates the top-voted player, announces only the outcome (never the breakdown), advances to the next round.

Round length is configurable per game, from minutes to multi-day.

## Roles

- **Player** — active participant; can vote and hold/use powers.
- **Ghost** — eliminated player; cannot vote or use powers affecting the living; can participate in the Seance mechanic (below); cannot participate in any communication about the current game (a social rule, not technically enforced — see Communication Policy); unlocked full visibility at game end.
- **Game Engine (automated)** — runs the core loop: vote collection, resolution, power distribution/logging, deadline enforcement, narration as Bart's ghost.
- **Human Game Master** — a real person who configures the game at setup and retains limited discretionary powers during play (tie-breaking, anonymous power grants, mid-game twists). Does not play to win.

## Voting Rules

- Votes are **always private and anonymous** — no attribution, ever, until the end-of-game reveal.
- One vote per player per round by default; some powers add/alter this.
- **Ties** (for elimination) are broken by the Human GM if present (in-character), otherwise by the system at random (logged either way).

### Missed deadlines

Chosen once, at game setup, as one global mode for that game (GM picks one):
1. **Forfeit-is-fatal** — miss the deadline, you're eliminated.
2. **No consequence** — miss the deadline, nothing happens beyond no vote being cast.
3. **One-round penalty** — miss the deadline, you're excluded from voting/powers for the next round only (not eliminated).

## Double Vote

- Baseline recurring power: one random player per round gets a second vote.
- Recipient is told privately; never obligated to disclose; may lie about holding it.
- Cadence should be **dynamically recalculated** based on current player count, with a GM-configurable minimum floor. Exact default numbers are unresolved (see Open Questions).

## Powers System

**Core rule: total secrecy.** The existence of the powers system is never stated in player-facing rules or UI copy. Players discover it only by experience. Do not add onboarding text/tooltips that reveal the system exists ahead of time.

**Acquisition methods** (a power may support more than one):
- *Random drop* — granted algorithmically at round start.
- *Earned trigger* — granted automatically on meeting a defined condition (see below).
- *GM discretionary grant* — Human GM manually and anonymously grants a power. Always logged.

**Power catalogue** — all on by default, individually toggleable by the GM at setup:

| Category | Power | Effect |
|---|---|---|
| Informational | Rewind | Privately view full vote breakdown of one past completed round |
| Informational | Whisper | Learn (yes/no only) if you were the top vote target last round |
| Informational | Watcher | Learn who currently holds the double vote (not revealed to others) |
| Defensive | Ward | Immune to elimination for one round |
| Defensive | Deflect | One vote against you is redirected back onto its caster |
| Defensive | Null | One vote against you this round is discarded |
| Offensive | Second Voice | Grants a standalone double-vote effect outside its normal rotation |
| Offensive | Compel | Force one player to privately reveal one vote they cast |
| Offensive | Silence | Block one other player's power use this round (anonymously) |
| Social/Chaos | Swap | Exchange two players' cast votes before tallying |
| Social/Chaos | False Flag | Send a private "tip" appearing to come from a third party of your choosing — **tone risk flagged, may not ship in v1** |

**Earn triggers (algorithmic):**
- *Near-miss* — most/2nd-most votes in a round but survived
- *Ghost-mode* — received zero votes in a round
- *Called it* — correctly, privately predicted the double-vote holder or the elimination before results
- *Survival streak* — survived N consecutive rounds without being top target (N configurable)
- *Underdog run* — survived multiple consecutive rounds while in the bottom-two most-voted

Deliberately excluded: any trigger based on "voted for the player who got eliminated" (would reward bandwagon voting).

**Logging:** every power grant/use is logged in full detail regardless of source. Never shown during play — surfaces at the End-of-Game Reveal.

## Ghosts: The Seance

Each round, ghosts are shown a short curated list (e.g. 3 options) of alternate narration flavors for that round's already-decided elimination announcement. They vote among themselves; majority picks which version is shown to all living players. A tie falls back to a default/neutral version.

This is **entirely cosmetic** — no effect on who is eliminated, no real information revealed, no effect on living game state. Purpose: give ghosts a recurring, meaningful, collective activity while excluded from the real game.

**Explicitly deferred (not decided, candidates for v1.1+, do not build yet):**
- Targeted cosmetic haunts (ghost triggers a harmless visual/sound effect on a specific living player, no information content).
- A ghost-only social space ("waiting room") separate from any living communication channel.

## End-of-Game Reveal

Once the game ends, unlock for everyone (living and ghosts):
- **Vote Tree** — full branching visual of every round's votes and eliminations across the whole game. Must stay legible/navigable across the 3–20+ player range.
- **Power Log** — every power granted/used, by/on whom, and how it was acquired.
- **GM Action Log** — every tie-break, discretionary grant, or twist the Human GM made.

## Human GM Capabilities

- **Setup:** create game, invite players (3–20+), set round timing, choose the missed-deadline mode, configure the power-pool toggle list.
- **During play:** break ties in-character; grant powers anonymously (logged); trigger mid-game twists. **Scope is resolved: no category is off-limits** — twists may affect votes, powers, round timing, and final outcomes (who's eliminated/wins). This is a deliberate design stance: the GM functions closer to a tabletop Dungeon Master with full narrative authority than a bound referee. Every twist is logged and surfaces at the end reveal regardless of scope — authority is unbounded during play, fully auditable after. The specific named menu of twists is still to be designed (implementation detail), but the boundary is settled.
- Can also **edit/customize outgoing narration** (Bart's messages aren't purely fixed/algorithmic).
- Maintains a **private helpline**: each player can privately message the GM with questions any time. This is a narrow exception to the "no in-app chat" stance — player-to-GM only, does not apply to player-to-player communication.
- **Not a player:** no win condition, doesn't vote.

## Communication

The app does not mediate player discussion — players use whatever channel they want. The app's only job is state tracking, private vote collection, round resolution, notifications, and the end reveal. Because of this, any rule about ghosts not discussing the live game with active players is a **social rule, not a technical guarantee** — design ghost-facing features (like Seance) to carry zero real information for exactly this reason.

**Exception:** each player has a private helpline to the Human GM for questions outside the normal round flow — player-to-GM only, does not extend to player-to-player messaging.

## Endgame: The Three Doors

Triggered when exactly 3 players remain. All voting/elimination mechanics stop.

- Three numbered doors appear, all labeled "Exit."
- Each of the 3 remaining players privately picks a **unique** number within one round-equivalent window.
- If any two players pick the same number: **everyone loses**, no winner.
- If all three are unique: reveal next cycle, exactly one player wins as sole survivor.

No further voting occurs during this phase — it's a standalone coordination/trust mechanic, not a variant of the normal round loop.

## UI Layout — Main Round Screen (Wireframe)

Structural layout only, not a visual skin, for the primary screen shown during an active round:

```
┌────────────────────────────────────────────────────────────────┐
│ Header — round number, deadline countdown (persistent)         │
├───────────────────────────────────────────┬────────────────────┤
│ Cinematic viewport                         │ Player roster      │
│ Image, gif, or slideshow for key moments.  │ Alive/ghost status │
│ Collapses to zero height when idle.        │ per player.        │
│                                             ├────────────────────┤
│                                             │ Your status        │
│                                             │ Alive or ghost,    │
│                                             │ held powers if any.│
├───────────────────────────────────────────┼────────────────────┤
│ Narration log                              │ Vote / action      │
│ Typewriter text — Bart's ghost narration   │ Opens the private  │
│ and system events. Main panel, scrollable, │ vote modal.        │
│ the largest region on screen.              │                    │
└───────────────────────────────────────────┴────────────────────┘
```

Design intent: the vote/action control stays visually separate from the roster (voting must stay anonymous, so it shouldn't sit alongside public info). The cinematic viewport sits above the narration log and collapses when unused, rather than acting as a full-screen interrupt.

**Not yet decided:**
- Whether a cinematic moment should fully replace the narration log or sit above it while narration keeps scrolling underneath.
- Whether this two-column arrangement is the primary (desktop) layout with a mobile variant, or whether a mobile-first layout should be designed first, given likely mobile-heavy usage.

**Separate screens, not part of this layout** — do not merge these in: private vote modal, Seance screen (ghosts only), Human GM panel, end-of-game reveal, Three Doors endgame screen.

## Open Questions (not yet resolved — do not assume answers when implementing)

1. Concrete default numbers for double-vote cadence across the 3–20+ player range.
2. The specific named menu of GM twists (category boundary is resolved — no category is off-limits; the actual list of named twists is still to be designed).
3. Whether "False Flag" ships in v1 given its tone risk.
4. Targeted cosmetic haunts and the ghost waiting room — deferred, candidates for a later version only.

## Non-Goals for v1

- No in-app chat/messaging system.
- No public/real-time vote reveal during play.
- No player-facing documentation or UI hinting that the powers system exists before it's encountered.
- No targeted ghost haunts or ghost-only social space (deferred, see Open Questions).
