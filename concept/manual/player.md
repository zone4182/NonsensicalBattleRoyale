# Player Manual

Everything a player can actually do in the app today, in the order you'll run into
it — from redeeming your invite to the game ending. This describes what's built and
working right now, not the full long-term design (see `GAME-DESIGN.md` for that).

A couple of screens mentioned below aren't finished yet — flagged inline where that's
the case, so this stays accurate rather than aspirational.

## 1. Redeeming your invite

You'll receive a personal invite link (or just the token itself) from the Game
Master. Opening it lands you on the redeem screen:

- Enter your invite token (pre-filled if you opened a direct link).
- Optionally, enter **your own name**. This is what other players and the narration
  will call you for the rest of the game. If you leave it blank, you'll appear under
  the name the GM invited you as.
- Submit. If the token's invalid or already used, you'll get a clear error instead of
  a silent failure.

Once redeemed, you're taken straight into the game.

## 2. Arrival (the prologue)

Your personal arrival story plays out here — this is fixed, non-interactive story
text, not a choice-driven scene.

- If the game hasn't started yet (the GM is still waiting on other players, or
  hasn't manually started Round 1), you'll see a waiting message instead of a
  "Continue" button. The screen checks in the background and updates on its own once
  things move — no need to keep refreshing manually.
- Once the game is underway, a **Continue** button appears and takes you into the
  main game screen.

## 3. The main game screen

This is where you'll spend most of your time each round. It has four parts:

- **Header** — current round number, the deadline, and a live countdown to it.
- **Narration** — the running story log: what's happened so far, in-character.
- **Roster** ("the hub") — who's hosting, who's still alive, and who's already been
  eliminated (ghosts). A **Settings** button also lives here (see §7).
- **Your status** — whether you're alive or a ghost.

The screen refreshes itself in the background periodically, so you don't need to
manually reload to see updates from other players or the GM.

## 4. Voting

Each round, every living player privately casts one vote for who they think
shouldn't make it to the next round.

- Tap **Vote** to open the private voting screen.
- Pick one player from the list (ghosts aren't selectable).
- Optionally, add a short reason (up to 100 characters). **Only the GM ever sees
  this** — never shown to other players, and never revealed to anyone else at the
  end-of-game reveal either.
- Confirm. Your vote is private and anonymous — no one, including the GM's public
  narration, ever announces who voted for whom during play.
- Depending on how the GM configured this game, you may or may not be able to
  **change your vote** after casting it, any time before the round resolves. If
  changing is allowed, the Vote button relabels itself to make that clear; if not,
  your vote is final the moment you submit it.

**If you miss the deadline** without voting, what happens depends on a setting the
GM picked when creating the game — one of three:
- It counts as an automatic elimination (same as being voted out).
- Nothing happens beyond simply not having a vote counted that round.
- You're excluded from voting the *following* round only, not eliminated.

Once the deadline passes (or everyone's voted), the round resolves automatically:
the narration announces who was eliminated — never the vote breakdown, never who
voted for whom.

## 5. If you're eliminated

You become a ghost. Ghosts:

- Can no longer vote or take any action affecting the living game.
- Can still see the roster, narration, and the rest of the game unfold.
- Shouldn't discuss the live game with players who are still alive — this is a
  fairness rule for everyone's benefit, not something the app enforces technically.

A ghost-only "Seance" screen is built into the app (a lighthearted, purely cosmetic
vote among ghosts on how the narration should be phrased) but isn't reachable from
the main game screen yet — not part of the working flow today.

## 6. The Three Doors (endgame)

Once exactly 3 players remain, normal voting stops and this replaces it:

- Three numbered doors appear, all labeled "Exit."
- You privately pick one number: 1, 2, or 3.
- If any two of the three remaining players pick the **same** number, everyone
  loses — no winner.
- If all three picks are unique, the outcome is revealed once everyone's chosen.

Like voting, there's no visibility into what anyone else picked until the reveal.

## 7. Settings

A **Settings** button sits at the top of the roster/hub on the main game screen.
Currently it holds one option:

- **Enable notifications** — a checkbox. Turning it on asks your browser/device for
  permission, then you'll get push notifications for:
  - A round's voting deadline getting close (once time is nearly up).
  - A new round starting.
  
  These only ever go to players — never anything else, and never anything that would
  spoil who voted for what. If your browser blocks notifications, the settings
  screen tells you and points you to your browser/device settings to re-enable them.

## 8. Getting help — the Helpline

If you're stuck on how a rule or mechanic works — not on how to win — there's a
private line to the GM:

- Open **Need help?** from the main game screen.
- The screen is explicit that this channel is for game-mechanics questions only, not
  strategy tips.
- Type your question and send it. You can ask more than one separate question over
  the course of the game — each is tracked independently.
- Your full question-and-answer history stays visible on this screen for the rest of
  the game, including any reply the GM has sent. If a question hasn't been answered
  yet, it's shown clearly as still waiting.

This is strictly one-on-one with the GM — never visible to, or shared with, other
players.

## 9. Language

A small language switcher (EN/NL) is available in the corner of most screens. It
remembers your choice for next time you open the app.

## 10. Installing the app

The landing page offers an **Install app** option:

- On Android/Chrome, this triggers your browser's native "install as app" prompt.
- On iPhone/Safari (which doesn't support that prompt), tapping it instead opens
  step-by-step instructions for adding it to your home screen manually via the
  Share menu.

Installing isn't required to play — everything above works the same in a regular
browser tab.

## 11. End of the game

Once the game ends (either through normal elimination down to one survivor, or the
Three Doors outcome), you're taken to an End-of-Game Reveal screen.

**Not finished yet:** today this screen just confirms the game has ended. The full
reveal (the complete vote history, and everything else that happened behind the
scenes over the course of the game) is planned but not built yet.
