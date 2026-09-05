# Battle Royale — Game Design Specification
**Version:** 0.9 (Draft — mechanics locked, remaining open items narrowed and listed in Section 13)
**Status:** Pre-technical. This document defines *what the game is*, not how it's built.

---

## 1. Concept & Tone

A social deduction / survival game for a group of friends (originally played manually over WhatsApp). Players wake up in a house; the friend who was supposed to run their gathering — **Bart, the Game Master** — is dead, found with a knife in his back. His ghost, however, can still be reached: an automated system speaks in his voice, running the game from beyond the grave.

Each round, the group votes — in total secrecy — on one person to eliminate. Nobody ever learns who voted for whom *during* the game. Eliminated players become ghosts: they can no longer act on the living game, but they linger, watch, and have their own quiet influence on how the story is told. Hidden throughout the game are secret powers nobody is told about in advance — players only discover the system exists by experiencing it happen to them, or by piecing together strange outcomes.

The game ends when three players remain, and the format shifts entirely into a one-shot, high-stakes coordination puzzle: the Three Doors.

**Tone target:** playful horror-comedy, not genuinely dark. Bart's ghost narration should feel like a mischievous host, not an actual threat. The stakes are entirely social (bragging rights, revealed betrayals) — never anything real.

**Presentation direction:** the interface is intended to lean old-school and text-driven — a terminal/BBS-like feel, with Bart's ghost narrating outcomes as typed text rather than heavily illustrated screens. This is a deliberate aesthetic constraint carried forward into the technical spec, not just flavor — it reinforces the tone and keeps early builds cheap to produce well.

---

## 2. Objective

- **Primary goal:** be the last player standing, or one of the survivors who successfully escapes through the Three Doors.
- **Secondary, informal goal:** come out of the end-of-game reveal looking good — i.e., the social "who betrayed whom" reveal is itself a second layer of the game that everyone plays toward, even after elimination.

---

## 3. Scale

The game should support **3 to 20+ players** in a single instance. This is a deliberate flexibility choice with real downstream implications:

- The End-of-Game Vote Tree (Section 9) needs to remain legible at large player counts — expect it to need scrolling/collapsing/filtering rather than a single flat diagram.
- Setup/invite flows need to handle a sizable roster comfortably, including replacing a no-show before the game starts.
- Power distribution and round pacing should be sanity-checked at both extremes (a 3-player game skips straight into endgame-adjacent territory; a 20-player game needs enough rounds and power variety to stay interesting before it narrows down).

---

## 3a. Onboarding & Invite Flow

Starting a game is treated as the first act of the story, not a signup screen.

- **Invites are unique per person.** Each invited player gets their own personal invite link (sent via email or WhatsApp), tied to their identity. This is a deliberate choice: it lets the game display real guest names rather than anonymous handles, and lets the GM know exactly who has accepted. The invite text itself is written in-fiction — an invitation to a gathering at a house — while carrying the real-life GM's actual name, so recipients recognize it as a genuine message from a friend rather than spam.
- **Opening the invite triggers a personal arrival prologue.** This is individual and asynchronous — each player experiences their own "arrival at the house" whenever they open their invite, not in lockstep with anyone else.
- **A fixed, non-interactive sequence reveals the Game Master's death** as part of or immediately following the arrival prologue. No choices are made during this sequence; every player sees the same fixed narrative beat.
- **The player roster reveals progressively**, not all at once. As each invited player accepts and arrives, they become visible in the in-app roster. This is a deliberate mechanical choice, not just flavor — it means players genuinely don't know the full guest list up front, which is intended to spill out into real-world, out-of-band conversation among friends ("wait, did you get invited too?"), reinforcing the game's existing communication policy (Section 11).
- **Round 1's official start (and its deadline clock) is configurable per game**, chosen by the GM at setup as one of three modes:
  1. Wait until every invited player has accepted.
  2. The GM manually starts the round whenever they choose.
  3. Auto-start at a scheduled date/time, regardless of who has or hasn't accepted yet.

**No-show resolution:** if Round 1 starts under mode 2 or 3 before an invited player has accepted, that player is excluded from the game entirely, as if never invited — not entered as a ghost or spectator.

---

## 4. Round Structure

A game is divided into **rounds**. Each round has three phases:

1. **Open phase** — players talk, scheme, and negotiate through whatever channel they like (see Section 11). The app does not mediate this.
2. **Voting window** — each active player privately submits exactly one vote (or more, if they hold vote-granting powers) to the system before a deadline set at game setup.
3. **Resolution** — the system tallies votes, applies any powers used during the round, resolves the outcome, announces only *who was eliminated* (never the vote breakdown), and opens the next round.

Round length is fully configurable at setup (see Section 13) — from minutes to multi-day, and can differ round-to-round if the GM chooses to adjust it mid-game.

---

## 5. Roles

| Role | Description |
|---|---|
| **Player** | An active participant. Can vote, hold/use powers, communicate freely outside the app. |
| **Ghost** | An eliminated player. Cannot vote or use in-game powers affecting the living. Can participate in the Seance mechanic (Section 10) and, eventually, the end-of-game reveal. Cannot participate in any live communication channel related to the ongoing game. |
| **Game Engine (automated GM)** | Runs the core loop: collects votes, resolves rounds, distributes and logs powers, enforces deadlines, narrates outcomes in Bart's ghost persona. |
| **Human Game Master** | A real person who sets up the game and retains limited discretionary powers once it's running (see Section 12). Does not otherwise play. |

---

## 6. Voting

- Votes are **always private and anonymous**. There is no point in the game — not mid-round, not mid-game — where a vote is attributed to a player. The only exception is the full reveal after the game concludes (Section 9).
- Each player casts one vote per round by default. Some powers grant additional or altered votes (Section 8).
- **Ties (for elimination):** if two or more players are tied for the most votes, the Human GM breaks the tie (in character, as Bart's ghost "making the call"). If no Human GM is available or configured for a given game, the system breaks it randomly and logs that it did so.

### Missed deadlines

Since play happens in defined round intervals with a hard voting deadline, "not voting" is a real, expected case — not an anomaly to detect. At game setup, the Human GM chooses **one** of the following modes, which applies for the whole game:

1. **Forfeit-is-fatal** — a player who misses the deadline is eliminated.
2. **No consequence** — nothing happens; the round resolves as if that player simply cast no vote.
3. **One-round penalty** — the player is not eliminated, but is excluded from voting and from using powers for the following round only.

---

## 7. The Double Vote

- A baseline recurring power: one player per round is granted a second vote.
- Recipients are told privately; they are never obligated to disclose it, and may lie about having it.
- **Cadence:** in the original draft this was defined as "once every N weeks, where N = number of remaining players" — which breaks down as the player count shrinks. For v0.9, treat this as **configurable and dynamically recalculated** each round based on current player count, with a **GM-set floor** (e.g., never more frequent than every 2 rounds). Exact default numbers remain an open item (Section 13).

---

## 8. Powers System

### 8.1 Core design principle: total secrecy

The existence of a hidden powers system is **never stated in the rules shown to players.** Players discover it only by experiencing an effect, noticing an anomaly, or being told by another player who figured it out. This is a deliberate, load-bearing design choice — do not add onboarding text, tooltips, or hints that reveal the system exists before it's encountered.

### 8.2 Acquisition methods

Every power in the catalogue is tagged with how it can be obtained. A given power may be available via more than one method:

- **Random drop** — algorithmically granted at the start of a round, independent of performance.
- **Earned trigger** — granted automatically when a player meets a specific in-game condition (see 8.4).
- **GM discretionary grant** — the Human GM manually and anonymously grants a power to a player of their choosing, for narrative or balance reasons. Always logged (Section 9).

### 8.3 Power catalogue (by category)

All powers below are **on by default** but individually toggleable by the Human GM at game setup (Section 12.1).

**Informational**
- *Rewind* — privately view the full vote breakdown of one already-completed past round.
- *Whisper* — learn whether you personally were the top vote target in the previous round (yes/no only, no numbers).
- *Watcher* — learn who currently holds the double vote, without revealing it to anyone else.

**Defensive**
- *Ward* — immune to elimination for one round, even if you receive the most votes.
- *Deflect* — one vote cast against you this round is redirected back onto whoever cast it (the target never learns this happened).
- *Null* — cancel out one vote cast against you this round (it's simply discarded, not redirected).

**Offensive**
- *Second Voice* — the base double-vote effect, available as a standalone grantable power outside its normal rotation.
- *Compel* — force one player to reveal (to you only) one vote they personally cast this round.
- *Silence* — block one other player from using any power they hold this round, without revealing whose power was blocked.

**Social / Chaos**
- *Swap* — exchange two players' cast votes with each other before tallying.
- *False Flag* — send a private "tip" to a player that appears to originate from a third party of your choosing. **Flagged for tone review — candidate to hold back from v1.**

### 8.4 Earn triggers (algorithmic)

- **Near-miss** — received the most or second-most votes in a round but survived.
- **Ghost-mode** — received zero votes in a round.
- **Called it** — correctly and privately guessed, before results are announced, who holds the double vote that round or who will be eliminated.
- **Survival streak** — survived N consecutive rounds without ever being the top target (N configurable).
- **Underdog run** — survived multiple consecutive rounds while consistently in the bottom-two most-voted.

*(Deliberately excluded: any trigger tied to "voted for the player who got eliminated," since it would passively reward bandwagon voting and dampen the guessing-game chaos that's central to the design.)*

### 8.5 GM setup toggle

At game creation, the Human GM sees a checklist of every power in the catalogue (grouped by category), each defaulted to **on**, with the ability to switch any off for that specific game instance.

### 8.6 Logging

Every power grant and use — regardless of acquisition method — is logged internally with full detail (who, what, when, target, and whether it was random/earned/GM-granted). This log is never shown during play, but forms part of the End-of-Game Reveal (Section 9).

---

## 9. End-of-Game Reveal

Once the game concludes (a winner emerges from the Three Doors, or the game otherwise ends), **everything** is unlocked for all participants, living and eliminated:

- **The Vote Tree** — a full visual timeline: every round, every vote cast, every elimination, rendered as a branching diagram across the game's history. Must remain legible/navigable across the full supported scale range (3–20+ players — see Section 3).
- **The Power Log** — every power granted or used, by whom, on whom, and how it was acquired (random/earned/GM-granted).
- **GM Action Log** — any tie-breaks, discretionary grants, or twists the Human GM made, so their influence is fully auditable after the fact even though it was invisible during play.

This reveal is intended to be the game's signature shareable moment.

---

## 10. Ghosts: The Seance

Eliminated players remain non-participants in the living game (no votes, no powers affecting outcomes, no real information about votes or eliminations before the end reveal) — but they are not idle.

**Seance mechanic:** each round, ghosts are presented with a short curated list (e.g. three options) of alternate narration styles for how Bart's ghost will announce that round's already-decided outcome (e.g. tone/flavor variants — comedic, ominous, deadpan). Ghosts vote among themselves; the majority choice is used for the announcement shown to all living players. A tie results in a default/neutral narration being used instead.

This mechanic is **entirely cosmetic** — it never changes who was eliminated, never reveals any vote information, and has no effect on the living game's state. It exists purely to give ghosts a recurring, meaningful, collective decision to make while they wait.

**Deferred (not decided for v1, logged as candidates for a later version):**
- *Targeted cosmetic haunts* — ghosts spending a charge to trigger a harmless cosmetic effect (visual/sound sting) on a specific living player's screen, with no informational content.
- *Ghost-only social space ("waiting room")* — a standing space for eliminated players to chat/theorize with each other, separate from any living communication channel.

Both remain explicitly open for a future version rather than ruled out.

---

## 11. Communication Policy

The app does **not** mediate player-to-player discussion. Players are free to use any channel they like — WhatsApp, a call, in person, carrier pigeon. The app's sole responsibilities are: state tracking, private vote collection, round resolution, notifications/reminders, and the end-of-game reveal.

**Exception:** each player has a private helpline to the Human GM (Section 12.2) for asking questions outside the normal round flow. This is a player-to-GM channel only and does not extend to player-to-player messaging, which remains entirely out-of-band.

Note: because communication is entirely out-of-band, "ghosts shouldn't discuss the live game with active players" is a **social rule, not a technically enforced one** — the app cannot prevent a ghost from texting a living friend directly. The Seance mechanic and any future ghost features are deliberately designed to carry zero real information, precisely because this channel can't be locked down technically.

---

## 12. The Human Game Master

### 12.1 Setup phase
- Creates the game instance, invites players (supporting rosters from 3 up to 20+).
- Sets round interval/timing.
- Chooses the missed-deadline mode (Section 6).
- Configures the power pool via the toggle screen (Section 8.5).

### 12.2 During play
- Breaks tied votes (in-character, as Bart's ghost).
- Can grant powers anonymously and at will, subject to the same logging as any other power source.
- Can trigger narrative **twists** mid-game. **Scope resolved:** no category of game state is off-limits — twists may affect votes (e.g. forcing a re-vote or altering a tally), powers (granting/revoking/triggering effects), round timing (extending, shortening, or skipping a round), and final outcomes (who is eliminated or wins). This is a deliberate design stance: the Human GM functions closer to a tabletop Dungeon Master with full narrative authority than a bound referee. The only constraint is that every twist is logged in full and surfaces in the End-of-Game Reveal (Section 9) regardless of scope — authority is unbounded during play, but fully auditable afterward. The specific catalogue of named twists (the actual menu the GM sees) is still an implementation detail to design, but the boundary of what's allowed is now settled.
- Can **edit or customize outgoing narration** — Bart's ghost's messages are not purely fixed/algorithmic; the GM can adjust flavor text before or as it's delivered.
- Maintains a **private helpline**: each player can send the GM a private question at any time, answered outside the normal round flow. This is a narrow, deliberate exception to the general "no in-app chat" stance (Section 11) — it is a player-to-GM support channel only, not a player-to-player one, and does not change the communication policy for players talking to each other.

### 12.3 What the GM is *not*
- Does not vote, does not play to win, is not a participant with a win condition.

---

## 13. Open Questions & Caveats (for v1.0 finalization)

1. **Double vote cadence formula** at low player counts (Section 7) — needs concrete default numbers, ideally validated by a playtest at both the 3-player and 20-player ends of the supported range.
2. **Specific GM twist catalogue.** The category boundary is now settled (Section 12.2 — no category is off-limits), but the actual named menu of twists a GM sees in the UI still needs to be designed.
3. **False Flag power** (Section 8.3) — tone/content check still pending; may ship disabled by default or be held back entirely from v1.
4. **Targeted cosmetic haunts and the ghost waiting room** (Section 10) — explicitly deferred, not decided, candidates for v1.1+.

---

## 14. Endgame: The Three Doors

When exactly three players remain:

- All standing votes/eliminations mechanics stop.
- Three numbered doors appear, all labeled "Exit."
- Each of the three remaining players has one round-equivalent window to choose a **unique** door number and submit it privately.
- If any two players choose the same number, **everyone loses** — no winner is declared.
- If all three numbers are unique, the outcome is revealed the following cycle, and exactly one player wins and is crowned sole survivor.

This is a pure coordination/trust puzzle with no further voting — deliberately different in texture from the rest of the game, and intended as its dramatic climax. No changes proposed to this mechanic at this stage.

---

## 15. UI Layout — Main Round Screen (Wireframe)

A first structural wireframe for the primary screen a player sees during an active round (not the GM panel, not the end-of-game reveal, and not the Three Doors screen — those are separate screens, listed below). This is a layout decision only — panel placement and purpose — not a visual skin. Visual treatment (terminal fonts, chat-thread styling, etc.) is addressed separately under Visual & Interaction Inspiration.

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

**Design notes:**
- The **vote/action control is deliberately small and separate from the roster**, rather than an inline "click a player to vote" panel — since votes must stay anonymous even in the UI's own visual language, the act of voting shouldn't visually sit alongside public information like who's alive.
- The **cinematic viewport sits above the narration log and collapses when unused**, keeping the "story keeps scrolling" feel intact rather than treating a cinematic as a jarring full-screen interruption. **Open question:** should a cinematic moment fully replace the narration log (a dramatic full takeover) or sit above it while narration keeps scrolling underneath (more continuous, closer to how STAY/Lifeline handle pacing)? Not yet decided.
- **Open question:** given the likely mobile-first usage pattern (PWA, chat-app-influenced aesthetic), should this two-column layout be treated as the primary (desktop) layout with a collapsed/tabbed mobile variant, or should the mobile layout be designed first and this treated as the expanded case? Not yet decided.

**Screens intentionally excluded from this layout** (each is a distinct screen with different purpose and audience):
- Private vote modal (opened from the Vote/Action panel)
- Seance screen (ghosts only)
- Human GM panel (setup, tie-breaks, twists, power toggles)
- End-of-game reveal (Vote Tree, Power Log, GM Action Log)
- Three Doors endgame screen

---

*End of v0.9. Once the four items in Section 13 are resolved, this moves to v1.0 as the final pre-technical design baseline.*
