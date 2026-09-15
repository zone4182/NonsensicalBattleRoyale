# Theme: Murder at the Manor

*Status: active, default, and currently the only theme.*

## Summary

A group of old friends gathers for their annual weekend at a mansion. Their host — the Game Master — is found murdered. The doors and windows won't open. A letter reveals the truth: this was the Game Master's own final game, and only one guest will leave alive. Weekly votes decide who is eliminated, until one survivor remains.

## Setting

- **Location**: an isolated mansion (het landhuis), cut off from the outside world (no phone signal, no wifi, no working landline, doors and windows sealed shut).
- **Key rooms** referenced in narration: kitchen, toilet, study (studeerkamer). These currently double as the generic room identifiers used by the game mechanics (see `concept/story/themes/README.md` in `CLAUDE.md` for the refactor this creates a need for).
- **Cast**: the Game Master (murder victim, author of the letter/rules), the players (the guests/friends), a randomly chosen player who discovers the body.

## Story beats

The full narration text (Dutch + English) for each beat lives in `concept/story/the-story-2.0.md`. Structurally, the theme is a sequence of beats mapped onto game phases:

1. **The Invitation** — no gameplay. Invitation letter signed by the Game Master.
2. **Invitation Accepted** — no gameplay. Waiting-room message.
3. **Prologue: Arrival** — no gameplay. Guests arrive, reminisce, go to bed.
4. **The Awakening and a Dark Discovery** — no gameplay. The Game Master is found dead in the toilet.
5. **Locked In, No Way Out** — no gameplay (optional future mini-game: attempting to force a door/window, always fails but could award a point).
6. **The Letter in the Study** — no gameplay itself, but this is the beat that introduces the real game rules (voting, deadlines, non-voting consequences) diegetically, without ever naming powers/items/points/ghosts.
7. **Round 1 Begins** — transition into the first voting round.

After this point, the theme drives per-round narration (elimination announcements, outcome flavor text) and any branch content (e.g. Three Doors, Séance) — see `concept/story/screen-flow-content-inventory.md` for the full screen/content inventory this theme currently fills in.

## Visual style

Not yet produced — `PlaceholderVisual.vue` stands in for all theme artwork today. See `concept/story/image-generation-prompt.md` for the intended visual direction for this theme.

## Notes for authoring a new theme

A new theme must supply equivalents for everything above (setting, cast framing, the 7-beat prologue sequence, per-round/outcome narration, and visuals) while keeping the underlying mechanics — round structure, voting, outcomes, branch mini-games — identical. See the "Themes" section in the repository root `CLAUDE.md` for the refactor needed before a second theme can be added without duplicating logic.
