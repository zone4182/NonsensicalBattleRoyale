# Game Master Manual

Everything a GM can actually do in the app today, in the order you'll use it — from
setting up a game to closing it out. This describes what's built and working right
now, not the full long-term design (see `GAME-DESIGN.md` for that). Rough edges and
unfinished pieces are flagged inline rather than glossed over.

Unlike the player manual, this one **does** cover the hidden-powers system and
similar mechanics — those are meant to stay secret from players, not from you.

## 1. Setting up a game

Reachable at `/gm/setup` without needing a session first (this is the one screen
that has to work before any invite exists). You'll need a **setup secret** — a
shared password separate from any invite link, proving you're allowed to create a
game at all.

Fields you configure:

- **Game name** — for your own reference in the GM panel only; players never see it.
- **Your display name** — how you appear as the Game Master in narration and the
  reveal.
- **Round interval** — how long each round's voting window stays open, in minutes
  (10 minimum). Use a large number (e.g. 1440 for a full day) for a slow, async game.
- **Missed-deadline mode** — what happens to a player who doesn't vote in time:
  forfeit is fatal, no consequence, or a one-round voting penalty. Applies for the
  whole game.
- **Round 1 start mode** — wait until everyone's accepted their invite, start it
  yourself whenever you're ready, or auto-start at a scheduled time (anyone who
  hasn't redeemed by then is excluded entirely).
- **Round resolution mode** — whether every round after the first resolves only when
  you click "Resolve now," or automatically the instant its deadline passes.
- **Allow players to change their vote** — on lets a player re-cast as many times as
  they like before the round resolves (only their latest vote counts); off makes a
  vote final the instant it's cast.
- **Random double vote** — on by default. Each round, one random alive player is
  secretly given a second vote; they're never told to disclose it, and nothing in
  the UI ever confirms it to anyone but them. If enabled, you also set the
  **cooldown**: how many recent rounds' holders are excluded from getting it again
  (default 2), or **-1** for a stricter rule — each player gets it at most once for
  the whole game, no repeats once everyone's had a turn.
- **Bot mode** — fills the game with algorithm-controlled players (random moves) so
  you can test a full game solo. You still need at least one real player besides
  yourself.

Submitting creates the game and shows you a **GM invite token**, shown exactly once
— copy it immediately, it's your own way back into this game if you lose your
session.

At least **5 real players** must accept their invite before Round 1 can start, no
matter which start mode you picked.

## 2. Inviting players

`/gm/invites`, only usable while the game is still in setup:

- Enter a display name, create the invite, then **copy the link** yourself and send
  it however you want (email, WhatsApp, etc.) — there's no in-app sending.
- The invite list shows every invite you've created and whether it's been redeemed
  yet. The token itself is only ever shown once, right when you create it — if you
  navigate away before copying it, there's no way to retrieve it again through the
  UI (you'd need to create a fresh invite).

**Rough edge:** a redeeming player can pick their own display name, which then shows
up in your GM views as `invite name (their chosen name)` — e.g. `Alex (Alexander)` —
everywhere a player is named, so you always know who's who even if they renamed
themselves. On the invite list itself here, though, you'll only see the name you
originally gave them.

## 3. Starting and running the game

`/gm/play` is your main control screen once players are in. It shows:

- **Settings summary** — a read-only recap of everything you configured at setup.
- **Resolved rounds — full vote breakdown.** This is the one place votes stay
  visible during play, and only to you: voter, target, vote count, whether it was a
  double vote, and any reason the voter attached (optional, 100 characters, private
  to you). Players never see this until — eventually — the end-of-game reveal.
- **Three Doors table**, once that phase is reached: who picked what, and the
  outcome.
- **Current game phase** and, if a round is open, its deadline/countdown.

Controls, shown only when relevant:

- **Start Round 1** — only available while the game's still in setup and enough
  players have joined.
- **Resolve now** — available whenever a round is open. Works even in manual
  resolution mode, and even before the deadline if you'd rather not wait once
  everyone's voted (it's a no-op with a clear message if it's not actually ready).
- **Resolve doors** — appears once Three Doors triggers (exactly 3 players left).
  Same idea: resolves once everyone's picked, tells you plainly if it's not ready
  yet.
- **Finish game** — an administrative "close this out" button, separate from the
  game ending naturally. Confirmation required. This logs you out of the GM session
  and sends you home. **Revisiting a finished game isn't built yet** — once you
  finish it, that's it from the app's side.

## 4. Granting powers, tie-breaks, and twists

At the bottom of `/gm/play` is a raw action log form — this is how you exercise
everything GAME-DESIGN.md describes as GM discretionary authority (unbounded scope,
always logged, surfaces at the reveal):

- **Grant power** has a proper form: pick a power and a target player from a
  dropdown.
- **Tie-break, narration edit, twist** all take a free-form JSON payload instead —
  there's no structured UI for these yet, you're writing the JSON by hand.
- An optional **round id** field scopes the action to a specific round. **Rough
  edge:** the UI never shows you a round's id anywhere — you'd currently need to
  pull it from the database directly if a specific action needs one.

**On the power catalogue itself:** all eleven powers (Rewind, Whisper, Watcher,
Ward, Deflect, Null, Second Voice, Compel, Silence, Swap, False Flag) can be granted
through this form. **Only six currently do anything when a player tries to use
them** — Rewind, Whisper, Watcher, Ward, Deflect, and Null. Granting one of the
other five (Second Voice, Compel, Silence, Swap, False Flag) will show the player
"Not usable yet" if they try to use it — worth knowing before you grant one expecting
a real effect.

## 5. The Helpline inbox

`/gm/helpline` is where players' private questions land — GAME-DESIGN.md's "narrow
exception to no in-app chat," player-to-GM only.

- A dropdown lets you filter by player, sorted by whoever's most recently active.
- Each player's thread shows every question they've asked, in order, each with its
  own reply box directly underneath if it's still unanswered.
- Once you reply, that reply shows permanently under that specific question — the
  player sees it in their own copy of the same thread.

There's no way to see this from any other screen, and no notification when a new
question comes in — you'll need to check this screen yourself.

## 6. What the GM doesn't do

Per GAME-DESIGN.md: you don't vote, you have no win condition, and every
discretionary action you take is logged in full and eventually visible to everyone
at the reveal — full authority during play, full accountability after.
