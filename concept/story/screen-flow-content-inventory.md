# Screen & Narrative Content Inventory

Every screen a player actually moves through, in the order they hit it, with what
visuals and narration text exist today versus what's still missing. Pulled directly
from the live copy in `web/src/locales/en.json` and the actual `.vue` files — not
aspirational, this is a snapshot of what's really there right now.

Status markers used throughout:
- ✅ built and wired in
- 🖼 image file already exists in `public/img/` but isn't used on this screen yet
- ❌ missing entirely

A separate **GM & utility screens** section near the bottom covers the non-narrative
screens for completeness. The **Carousel content structure** section at the very end
is the reusable template for pairing carousel images with narration beats, per your
request.

---

## 1. Landing Page

- **Title:** "Nonsensical Battle Royale"
- **Subtitle:** "The question is... who's next?"
- **Image(s):**
  - ✅ Background hero image: `mansion_at_night.png` (fixed full-viewport background
    behind the whole page, with a dark gradient overlay so text stays legible)
- **Narration/text:**
  - Tagline: "Where Clue, Diplomacy, Werewolf, Among Us, and Machiavelli meet. An
    asynchronous social deduction game, played with real friends over real days.
    Accept your invite, and find out what fate has in store for you. Every round,
    everyone votes in secret on who doesn't make it to the next one."
  - Buttons: "Host a new game" (currently hidden per your request, still reachable at
    `/gm/setup`), "Join a game"
  - Footer: "A Game by Zone4182", optional "Install app" button
- **Modal reachable from here:** iOS install instructions (see Utility Modals below)

---

## 2. Join / Redeem Invite

- **Title:** "You've been invited"
- **Subtitle:** "Enter your personal invite token to arrive at the house."
- **Image(s):**
  - ✅ `the_invitation.png` (framed above the heading)
- **Narration/text:**
  - Form labels only: invite token field, optional display-name field with hint
    ("Shown to other players as your name in the roster and narration...")
  - Error states: "No invite exists for this token." / "This invite has already been
    redeemed."

---

## 3. Arrival Prologue

The richest narrative screen so far — two story beats, fixed and non-interactive.
**This is the prime candidate for the image carousel** (see the template at the
bottom) — two distinct beats already exist as separate paragraphs, ready to pair
with separate images.

- **Title:** "Arrival"
- **Image(s):**
  - 🖼 `arrival-at-the-manor.png` exists but isn't wired into this screen yet
  - ❌ Planned: a new "driving to the manor" image (mentioned as something you're
    creating) — would pair with the travel beat below, likely *before*
    `arrival-at-the-manor.png` in sequence (en route → arriving at the gate)
  - 🖼 `mansion_daytime.png` exists, unused — a plausible fit for the "next morning"
    beat below, given it's a daytime scene
- **Narration/text (Beat 1 — arrival night):**
  - "Having accepted the invitation, you travel to the mansion mentioned in the
    letter. On arrival you find your old friends, each one happier to see you than
    the last. There's laughter, drinks, old stories being retold, and no shortage of
    arguing over who sleeps where. The catching-up runs deep into the night, until
    everyone finally goes to bed."
  - "None of you suspect that this will be the last night anything still feels
    normal."
- **Narration/text (Beat 2 — "The Next Morning"):**
  - "Slowly, everyone wakes up. One by one, the guests drift into the kitchen --
    coffee, hangovers, the usual morning-after murmur. But {GM's name} is missing.
    Their seat at the table stays empty while the rest wonder where they've gotten
    to."
  - "One of you walks to the toilet -- and finds them there. Dead. Still half on the
    seat, pants around their ankles. A deep stab wound gapes in their neck; the
    blood has spread into a wide, dark pool across the tiles, reaching the walls and
    the sink. Their eyes are wide open, frozen in terror. The smell of blood hangs
    thick and sweet in the small, airless room. No doubt about it: this was no
    accident -- and whoever did it is still somewhere in this house."
  - The GM's actual display name is substituted live; falls back to "the Game
    Master" if unknown.
- **Other states:** "Waiting for the rest of the house to arrive before the game can
  begin..." (shown instead of a Continue button if the game hasn't started yet)
- **Cross-reference:** the full shot list already has matching prompts for most of
  this beat: `Nonsensical_Battle_Royale_Shot_List_Modern.md` #01 The Invitation, #02
  Arrival at the Gate, #03 Friends Gathered in the Living Room, #04 The Empty Chair.
  None of these appear to be rendered/saved into `public/img/` yet except (possibly)
  `arrival-at-the-manor.png` for #02.

---

## 4. Main Round Screen

The core loop screen, four panels. Handled per-panel since each has independent
content.

### 4a. Header
- **Text:** "Round {N}", "Deadline: {date}", live countdown ("{d}d {h}h {m}m {s}s")

### 4b. Cinematic viewport
- ❌ **Fully built but never populated.** `CinematicViewport.vue` /
  `ImageCarousel.vue` exist and work (auto-advancing carousel, configurable
  interval), but `ui.cinematicActive` is never set to `true` anywhere in the app and
  `ui.cinematicImages` is never populated. The whole panel currently just never
  renders (`v-if="ui.cinematicActive"` stays false forever). This is the other prime
  candidate for the carousel template below, once there's an actual trigger design
  for *when* a cinematic moment should play during a round.

### 4c. Roster (player hub)
- **Text:** "Roster", "Host", "No Game Master.", "Guests ({count})", "No one left
  standing.", "Dead ({count})"
- Also holds the **Settings** button (notifications toggle) — see Utility Modals.

### 4d. Your status
- **Text:** shows "alive" or "ghost" (raw status word, not further narrated)
- Any held Hidden Powers render here via `PowerUseControls` (no narration copy of
  their own beyond the power's name/action button)

### 4e. Narration log
- **Empty state:** "Bart's ghost has nothing to say yet."
- **Live content** is generated server-side by `resolve-round`, one line per
  resolved round. All existing variants:
  - Tie broken randomly: *"Round {n} ends in a dead-even tie. Fate (and a coin
    toss) chose {name} to be eliminated."*
  - Clear vote: *"Round {n} is over. The house has spoken: {name} is eliminated."*
  - Tie, "no one dies" mode: *"Round {n} ends in a dead-even tie. Fortunately,
    everyone lives to see another day."*
  - Votes cast but target saved (e.g. by Ward): *"Round {n} is over. The votes are
    in, but the house's chosen target walks away unharmed."*
  - No votes at all: *"Round {n} ends in silence. No one cast a single vote, and no
    one was eliminated by vote."*
  - Appended when relevant: forfeit-by-silence penalty, one-round voting suspension,
    Ward-save mentions.
- No accompanying images today — this log is text-only.

### 4f. Vote / action panel
- **Text:** "Vote" / "Change vote" / "Vote cast" (button label depends on state),
  "You've cast your vote this round -- it's final.", "You've voted, but can still
  change your mind before this round resolves.", "You've locked in your vote for
  this round -- it's final.", ghost spectator notice, "Need help?" link

---

## 5. Private Vote Modal

- **Title:** "Cast your vote"
- **Subtitle:** "Private and anonymous -- no attribution, ever, until the
  end-of-game reveal."
- **Image(s):** ❌ none
- **Narration/text:** candidate list (names + "(ghost)" tag), optional 100-char
  reason field with hint, "Lock in my vote" section with its own hint text, and the
  full set of rejection-reason error strings (no open round / invalid target /
  entitlement exhausted / already locked / nothing to lock yet).

---

## 6. Three Doors

- **Title:** "The Three Doors"
- **Image(s):** ❌ none — three doors are rendered as plain buttons, no artwork
- **Narration/text:**
  - "Three numbered doors, all labeled \"Exit.\" Pick a door. If any two of you pick
    the same one, everyone loses. If all three picks are different, only one door
    was ever actually open -- whoever picked it is the sole survivor."
  - "You picked door {number}. Waiting for the reveal."
- **Cross-reference:** shot list #09 "The Three Doors" already has a prompt written,
  unrendered.

---

## 7. End-of-Game Reveal

- **Title:** "End-of-Game Reveal"
- **Image(s):** ❌ none
- **Narration/text:** placeholder only — "Unlocks the Vote Tree, Power Log, and GM
  Action Log for everyone once the game ends... this is a placeholder only." The
  actual reveal (who won, the full vote history, the winning door, etc.) isn't built
  yet at all.
- **Cross-reference:** shot list #10 "The Lone Survivor" has a prompt ready for
  whenever this screen gets built out for real.

---

## 8. Helpline

- **Title:** "Helpline"
- **Image(s):** ❌ none
- **Narration/text:** disclaimer ("This message goes privately to the Game Master
  for help with the game and its mechanics... Not for tips or hints on how to
  win."), compose form, full Q&A history with "Waiting for a reply from the GM..."
  state.

---

## 9. Seance

- **Title:** "The Seance"
- **Image(s):** ❌ none
- **Narration/text:** "Vote among alternate narration flavors for this round's
  already-decided elimination announcement. Entirely cosmetic." + 4 flavor options
  (Somber/Theatrical/Mysterious/Blunt).
- **Status:** screen exists and is fully built, but **not reachable** from anywhere
  in the current UI — no link to it from the ghost's view of the main round screen
  yet.

---

## 10. Not Found (404)

- **Title:** "404"
- **Narration/text:** "There's nothing behind this door."
- **Image(s):** ❌ none

---

## Utility modals (not narrative, listed for completeness)

- **Player Settings modal** — "Settings" title, notifications enable/disable
  checkbox, blocked/unsupported hint text. No imagery.
- **iOS Install modal** — "Install this app", 3 plain numbered steps (tap Share →
  Add to Home Screen → tap Add). No imagery.

---

## GM & utility screens (no narrative content by design)

These are functional GM tooling, not part of the story — listed only so this
inventory covers the whole app, not padded with fake narration subitems:

- **GM Setup** — game creation form.
- **GM In Play** — live settings/vote-breakdown/round-status tables, round controls,
  session export, GM action log form.
- **GM Invites** — invite creation + list.
- **GM Helpline Inbox** — per-player Q&A threads with reply boxes.

---

## Carousel content structure (template)

Reusable format for pairing carousel images with narration, one block per screen or
story beat that gets a carousel. `ImageCarousel.vue` itself is already built
(auto-advance, configurable interval, loops) and `ui.cinematicImages` /
`ui.cinematicIntervalMs` already exist in the `ui` store — what's missing per
screen is (a) the actual image files, and (b) populating those store fields with
this content at the right moment. **Syncing each image to a specific line of
narration text automatically (so the narration panel advances in lockstep with the
carousel) is explicitly not built yet** — today the carousel and the narration panel
are two independent panels with no shared timing. This template captures the
*content pairing* you want; the *mechanism* to actually sync them is a separate,
still-open task.

```
### Carousel: <screen or story-beat name>

Trigger: <when this carousel should start playing -- e.g. "on entering the Arrival
Prologue screen" or "the moment a round resolves with an elimination">
Interval: <ms per image, default 4000>

1. Image: <file path, e.g. /img/driving-to-the-manor.png> -- status: <exists /
   missing>
   Paired narration: "<the exact line of text shown/spoken alongside this image>"
2. Image: <file path> -- status: <exists / missing>
   Paired narration: "<text>"
3. (repeat as needed)
```

### Filled-in example: Arrival Prologue

```
### Carousel: Arrival Prologue

Trigger: on entering the Arrival Prologue screen, before the Continue button appears
Interval: 4000ms (default, unless a slower pace reads better for this much text)

1. Image: /img/driving-to-the-manor.png -- status: missing (you're creating this)
   Paired narration: "Having accepted the invitation, you travel to the mansion
   mentioned in the letter."
2. Image: /img/arrival-at-the-manor.png -- status: exists, unused
   Paired narration: "On arrival you find your old friends, each one happier to see
   you than the last. There's laughter, drinks, old stories being retold, and no
   shortage of arguing over who sleeps where. The catching-up runs deep into the
   night, until everyone finally goes to bed. None of you suspect that this will be
   the last night anything still feels normal."
3. Image: /img/mansion_daytime.png -- status: exists, unused
   Paired narration: "Slowly, everyone wakes up. One by one, the guests drift into
   the kitchen -- coffee, hangovers, the usual morning-after murmur. But {gmName} is
   missing."
4. Image: (needs a new toilet-scene image -- shot list #16/#27 have prompts ready)
   -- status: missing
   Paired narration: "One of you walks to the toilet -- and finds them there. Dead.
   ..."
```

This is a proposed pairing based on the existing text beats, not a locked decision
-- adjust freely as you generate real images.
