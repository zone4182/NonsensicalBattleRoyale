<!--
  CONTEXT FILE FOR AI CODING ASSISTANTS (e.g. Claude Code)

  This file defines the BOT MODE feature -- a GM-facing testing tool, not a
  player-facing game mechanic. Treat GAME-DESIGN.md and ARCHITECTURE.md as the
  source of truth for everything bots participate in; this file only covers what's
  specific to bots themselves.

  Status: v0.1 -- captured from an initial discussion with the user. Intent and
  the core mechanic are settled; most of the "how" is still open (see Open
  Questions) and should be flagged back to the user rather than assumed.
-->

# Bot Mode (v0.1)

## Purpose

Lets the GM populate a game with algorithmically-controlled players so the full round loop (voting, elimination, powers, endgame) can be played and observed **solo, in real time**, without needing to round up real testers for every playtest.

Not a player-facing feature -- there is no in-fiction explanation for bots, and no player-facing toggle. This is a development/testing tool exposed only in the GM setup flow.

## Core mechanic

- GM setup gets two new fields, alongside the existing round/deadline/start-mode settings:
  - **Bot mode** -- on/off.
  - **Number of bots** -- shown only when bot mode is on, a dropdown from 1 to 19.
- When enabled, the chosen number of bots join the game as if they were invited, redeemed, and arrived like any other player.
- Bots play by the same rules as everyone else -- same vote entitlements, same elimination logic, same powers catalogue. The only difference is *how they decide*, not what they're allowed to do.
- v1 decision-making is uniform random (e.g. random valid vote target each round). "Maybe intelligence will be added later" -- explicitly not a v1 requirement, don't build a strategy/heuristic layer now.
- A game still needs **at least one real player besides the GM** for bot mode to be useful as a testing tool -- bots supplement a normal game, they don't replace the need for a live person driving it (the GM's own token is a GM identity, not a player one, per GAME-DESIGN.md "Human GM Capabilities": GM doesn't vote). In practice this likely means the GM creates a second invite for themselves as a player, redeems it in a separate session, and plays alongside the bots.

## Interaction with existing rules (settled by inference, confirm before building)

- **5-player minimum** ([[min-players]] -- see GAME-DESIGN.md "Scale") -- bots should count toward this floor. That's the whole point: 1 real player + 4 bots reaches the minimum without needing 4 more humans.
- **20-player maximum** -- bot count (max 19 via the dropdown) plus real invited players should stay within this ceiling, consistent with the existing soft (not code-enforced) cap.
- **Missed-deadline mode** -- irrelevant to bots if they always act immediately (see Open Questions); they'd never be in a position to miss a deadline, so bot mode can't be used to test that mode's behavior specifically.

## Open questions (do not assume answers when implementing)

1. **Data model for a bot.** `players.invite_id` is a required, unique FK to `invites` -- a bot still needs some invite-shaped row to exist, or the schema needs to change. Does a bot get a synthetic, pre-redeemed invite, or does the schema grow a nullable-invite path? Separately: is "bot" a new `player_role`, or a `role = 'player'` row with a new `is_bot` boolean? The latter touches far fewer places (every `requireRole(ctx, "player")` check keeps working unmodified).
2. **When do bots get created?** At `create-game` time (so they count toward the 5-minimum immediately, before any real invites are even sent), or lazily at round-1-start? Creating them at game-creation time seems simpler and matches "GM sets up the game as usual, chooses bot mode and an amount."
3. **When do bots act?** Two real options:
   - **Instant** -- the moment a round opens, every living bot immediately casts its random vote(s) server-side, in the same transaction that creates the round. Simple, deterministic, no new scheduled job.
   - **Delayed** -- bots act at some random point before the deadline, closer to how a real player behaves, needed if you want to use bot games to test in-round UI states like "3 of 7 voted." This needs a new scheduled/cron entry point, which is a meaningfully bigger lift than instant voting.
   
   Given this is a testing tool and not a player-facing feature, I'd lean instant unless watching realistic pacing is part of what you want to test.
4. **Reuse vs. duplicate vote logic.** The architecture's hard rule is that the client never touches Postgres directly -- everything routes through an Edge Function so business logic has one home. Bots should cast votes through the exact same code path `submit-vote` uses (the shared `castVote` helper), not a parallel bot-only implementation, so bot behavior can't silently drift from real player behavior.
5. **Scope beyond voting.** Does "acts like a normal player" extend to:
   - Using powers when granted one (random valid target)?
   - Seance voting once eliminated (bots becoming ghosts)?
   - The mansion mini-game, if/when that ships?
   - Three Doors endgame (picking a random unique door) -- this one seems necessary for v1, otherwise a bot reaching the final 3 would deadlock the game waiting for a pick that never comes.
   
   My assumption: voting + Three Doors are required for a bot game to ever reach completion; powers and Seance are reasonable to defer. Worth confirming.
6. **Visibility.** Should the GM's own roster view mark which players are bots (useful for a testing tool), or should bots be indistinguishable from real players even to the GM? Doesn't need to be decided now, but affects `PlayerRoster.vue` scope later.
7. **Self-voting.** Nothing in `submit-vote` currently prevents a player from voting for themselves. Should bot random-target selection exclude itself, or is that an existing rule gap worth closing for everyone (not bot-specific)?

## Explicitly out of scope for v1

- Any bot "intelligence" beyond uniform-random choices.
- A player-facing indication that bots exist or are playing.
- Bots participating in the helpline (player-to-GM only, doesn't fit a bot).
