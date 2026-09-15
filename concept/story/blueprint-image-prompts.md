# Blueprint Image Prompts — Blackwood Manor Floor Plans

Image-generation prompts for top-down floor plan blueprints of the manor, styled as
aged Victorian architect's drawings (in-world "found document" aesthetic, matching the
`BLACKWOOD MANOR` naming and gothic Victorian art direction already established in
`Nonsensical_Battle_Royale_Shot_List_Modern.md`).

Room layout, adjacency, and staircase placement are pulled directly from the live
floor-plan data in `web/src/constants/manor.ts` / `supabase/functions/_shared/manor.ts`,
with room flavor from `concept/mini-games/mansion.md`.

## Layout reference

Ground Floor (3x2 grid, all orthogonal neighbors connected by a doorway):
```
Library        — Entrance Hall (staircase) — Living Room
Dining Room    — Kitchen                   — Toilet
```

First Floor (3x2 grid, bottom-right cell unused):
```
Guest Bedroom 1 — Landing (staircase) — Master Bedroom
Guest Bedroom 2 — Bathroom            — (no room)
```

The Entrance Hall and Landing sit directly on top of each other and are the only
staircase connection between floors.

Unlike the rest of the shot list (which deliberately avoids readable text), these
prompts keep room-name labels visible on purpose — the blueprint only works as an
in-game reference if players can actually read where each room is.

---

## Ground Floor prompt

> A top-down architectural floor plan of the ground floor of Blackwood Manor, drawn in
> the style of an aged Victorian architect's blueprint on yellowed parchment — fine
> sepia-brown ink linework, hand-drafted lettering, subtle foxing and creases on the
> paper, no measurements or dimension lines. The floor plan shows six rooms arranged in
> a 3-by-2 grid connected by simple doorway gaps in the walls between directly adjacent
> rooms (no diagonal connections): top row, left to right, labeled "Library," "Entrance
> Hall," and "Living Room"; bottom row, left to right, labeled "Dining Room," "Kitchen,"
> and "Toilet." A grand double-door main entrance is drawn on the exterior wall of the
> Entrance Hall, with a large staircase symbol (parallel tread lines with an arrow
> marked "UP") occupying part of the Entrance Hall leading to the floor above. Small
> window symbols (short perpendicular tick marks) are drawn along all exterior-facing
> walls of Library, Living Room, Dining Room, Kitchen, and Toilet. Simple door-swing
> arcs mark every doorway, including the front entrance. The outer perimeter wall is a
> single bold ink outline; interior walls are thinner lines. A small decorative compass
> rose and a hand-lettered title "BLACKWOOD MANOR — GROUND FLOOR" sit in a corner.
> Premium detailed 16-bit SNES-era pixel art rendering of this blueprint aesthetic,
> crisp pixel grid, soft aged-parchment shading, no characters, no UI, no watermark, no
> modern text, flat orthographic top-down view.

## First Floor prompt

> A top-down architectural floor plan of the first floor of Blackwood Manor, drawn in
> the style of an aged Victorian architect's blueprint on yellowed parchment — fine
> sepia-brown ink linework, hand-drafted lettering, subtle foxing and creases on the
> paper, no measurements or dimension lines. The floor plan shows five rooms arranged
> in a 3-by-2 grid (the bottom-right cell is open unused space, drawn as a blank
> landing/void or exterior roof outline, not a room) connected by simple doorway gaps
> in the walls between directly adjacent rooms (no diagonal connections): top row, left
> to right, labeled "Guest Bedroom 1," "Landing," and "Master Bedroom"; bottom row,
> left to right, labeled "Guest Bedroom 2" and "Bathroom," with the remaining
> bottom-right cell left blank. A staircase symbol (parallel tread lines with an arrow
> marked "DOWN") occupies part of the Landing, positioned directly above where the
> Entrance Hall's staircase would be on the floor below, implying a shared stairwell.
> Small window symbols (short perpendicular tick marks) are drawn along all
> exterior-facing walls of Guest Bedroom 1, Master Bedroom, Guest Bedroom 2, and
> Bathroom. Simple door-swing arcs mark every doorway. The outer perimeter wall is a
> single bold ink outline; interior walls are thinner lines. A small decorative compass
> rose and a hand-lettered title "BLACKWOOD MANOR — FIRST FLOOR" sit in a corner.
> Premium detailed 16-bit SNES-era pixel art rendering of this blueprint aesthetic,
> crisp pixel grid, soft aged-parchment shading, no characters, no UI, no watermark, no
> modern text, flat orthographic top-down view.

---

## Notes / open questions

- **Basement / 2nd floor / attic**: mentioned in `concept/mini-games/mansion.md` as
  existing in lore but not accessible in v1, and have no defined room layout yet — left
  out of both prompts above. A third "sealed off, not yet mapped" blueprint could be
  generated for flavor if wanted.
- **Text rendering risk**: if the image model mangles the hand-lettered labels, drop
  them from the prompt and overlay room names in-app instead (the Move-to-Room screen
  already renders room names via i18n keys, see `moveToRoom.rooms.*`).
- **Alternate style**: a plainer modern blueprint look (white linework on navy blue)
  could work better as a pure in-game legend/reference rather than an in-world story
  artifact — swap the "aged Victorian architect's blueprint on yellowed parchment"
  framing for that if the antique look doesn't read well as UI.
