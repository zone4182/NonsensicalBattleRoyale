# Image Generation Brief — Retro 16-bit Pixel Art

Meta-prompt for ChatGPT (image generation) to produce the full shot list of illustrations
needed for the-story-2.0.md and the mansion mini-game (mansion.md), matching the existing
reference images already in `web/public/img/` (`mansion_daytime.png`, `mansion_at_night.png`
— both 1536x1024, painterly SNES-era pixel art of "Blackwood Manor").

Copy everything in the fenced block below into ChatGPT as one message.

---

```
I'm building a narrative-driven social deduction game called "Nonsensical Battle Royale."
The story: a group of friends gather for their annual weekend at a gothic mansion called
Blackwood Manor. The next morning their host is found murdered, all doors and windows are
sealed shut, and a letter reveals they must now vote each other out, one by one, until only
one survivor remains -- everyone else meets a gruesome end.

I need a full shot list of illustrations for this game, all in one consistent art style,
matching two reference images I already have (describe them to me if you want detail, but
match this spec exactly):

ART STYLE SPEC:
- Retro 16-bit / SNES-era pixel art, painterly and detailed rather than blocky/low-res --
  visible pixel grid but rich color depth, soft gradient shading, and atmospheric lighting,
  similar in fidelity to modern "pixel art remaster" game key art (e.g. Octopath Traveler-
  style HD-2D lighting over a pixel-art base).
- Gothic Victorian architecture: dark stone, ivy climbing the walls, wrought iron, tall
  arched windows, ornate chimneys.
- The estate is named "Blackwood Manor" -- any signage, gates, or plaques in a shot should
  read that name, consistently spelled and styled.
- Two lighting modes only, matched to story tone: warm golden daylight (bright blue sky,
  soft clouds, sunlit stone) for anything before the murder, and moody moonlit night (deep
  blue-purple sky, glowing window light, fog, dramatic shadow) for anything at or after the
  murder. Never mix the two in one image.
- Landscape aspect ratio, 3:2 (matches 1536x1024). Wide, cinematic, symmetrical
  compositions where the scene allows it.
- No text, UI elements, speech bubbles, or watermarks baked into the image itself, except
  physical in-world signage (e.g. the manor's name plaque, a handwritten letter's visible
  but illegible-at-a-glance script).
- No characters' faces rendered in sharp, recognizable detail -- keep any human figures
  small, silhouetted, or turned away/obscured; the horror comes from atmosphere and
  implication, not gore-forward character close-ups.

TASK:
Generate a complete list of every distinct image concept I should produce for this
project, grouped by category, covering:

1. Key story beats (one per major narrative turn: the invitation letter itself, the
   arrival at the gate, the friends gathered in the living room at night, the empty chair
   at the breakfast table, the locked door/stuck window moment, the sealed letter on the
   study desk, the jar of folded votes by the door, a tense sunset "vote" moment, the
   Three Doors endgame room, a lone survivor leaving the gate at dawn).
2. Each explorable room in the mansion mini-game (entrance hall, library, dining room,
   kitchen, living room, the ground-floor toilet where the murder happened, master
   bedroom, two guest bedrooms, upstairs bathroom, the locked second-floor study, the
   attic, the locked basement door) -- interior shots, empty of people, used as
   background art for that room's screen.
3. Recurring motifs that might get reused across screens (a ghost/spirit silhouette in a
   hallway, the manor exterior in both lighting modes as already established, a close-up
   of the bloodstained toilet tile as a "crime scene" detail shot).

For EACH image concept, give me:
- A short name/label for it.
- A complete, ready-to-paste image-generation prompt written in the art style spec above
  -- fully self-contained, so I can copy just that one prompt into an image generator
  without needing anything else from this message.

Output this as one list, one concept at a time, so I can generate them individually.
```

---

## Notes for later

- Reference images already exist for the exterior day/night shots (item 3's "manor
  exterior" reuse) -- `web/public/img/mansion_daytime.png` and `mansion_at_night.png`.
  No need to regenerate those two; the meta-prompt still lists them for completeness in
  case a closer variant is wanted.
- Once generated, drop new images into `web/public/img/` alongside the existing two,
  named to match their concept (e.g. `toilet_crime_scene.png`, `library.png`).
- This is a brief for asset generation only -- wiring the images into actual screens
  (narration log, mansion mini-game room views, etc.) is a separate follow-up task.


CHATGPT OUTPUT:

# Nonsensical Battle Royale

## Complete Illustration Shot List & Ready-to-Paste Image Prompts

### GLOBAL VISUAL LANGUAGE

Every image below should depict the same fictional location, **Blackwood Manor**, as an established gothic Victorian country mansion. Maintain strong visual continuity between images: dark warm-gray stone, climbing ivy, steep slate roofs, ornate chimneys, tall arched windows, wrought-iron details, and an imposing but believable English country-estate architecture.

Use **retro 16-bit / SNES-era pixel art with unusually high detail**, comparable to a modern pixel-art remaster: a visible pixel grid, painterly pixel clusters, rich color depth, soft gradient shading, atmospheric lighting, carefully rendered textures and cinematic composition. The image should feel like premium HD pixel-art game key art rather than crude low-resolution pixel art.

Landscape **3:2 aspect ratio, 1536×1024 composition**. Favor wide cinematic compositions, strong environmental storytelling and depth.

Humans, when present, must remain small or partially obscured. Do not render recognizable facial details. No gore-forward imagery. No UI, captions, speech bubbles, logos, watermarks or modern objects. Physical in-world writing is allowed only when appropriate, and handwritten text should be indistinct rather than legible.

---

# 1. KEY STORY BEATS

## 01 — The Invitation

**Concept:** The mysterious invitation that brings the friends to Blackwood Manor.

**Prompt:**

> A cinematic still-life scene featuring an old cream-colored handwritten invitation resting on a heavy antique wooden desk inside a grand Victorian study at Blackwood Manor. The letter is sealed with dark red wax and bears elegant but illegible handwritten script, with no readable text. Beside it are an antique fountain pen, brass candleholder, a small pocket watch, scattered old photographs and a tarnished silver key. Warm golden pre-murder daylight enters through a tall arched window, illuminating dust particles and the rich wood grain. Through the window, hints of the manicured Blackwood Manor grounds are visible beneath a bright blue sky and soft white clouds. Premium detailed 16-bit SNES-era pixel art, painterly pixel clusters, rich color depth, soft gradient shading, crisp pixel grid, atmospheric but welcoming Victorian mystery-game aesthetic, cinematic 3:2 composition, no characters, no UI, no watermark.

---

## 02 — Arrival at the Gate

**Concept:** The friends arrive at Blackwood Manor for their annual weekend.

**Prompt:**

> A wide cinematic establishing shot of Blackwood Manor viewed from outside its open wrought-iron entrance gate on a beautiful pre-murder day. The grand symmetrical gothic Victorian mansion dominates the background, built from warm gray stone covered in patches of green ivy, with steep slate roofs, ornate chimneys, turrets, tall arched windows and a large central entrance. A stone driveway leads from the foreground gate toward the mansion, bordered by trimmed hedges, flowering shrubs and mature trees. A small group of friends can be seen only as tiny indistinct figures approaching the entrance with luggage, their faces completely unrecognizable. Bright blue sky, soft white clouds and warm golden sunlight illuminate the stone facade. The physical gate plaque clearly reads “BLACKWOOD MANOR.” Premium detailed 16-bit SNES-era pixel art, painterly and richly textured, visible pixel grid, soft gradient shading, cinematic depth, welcoming English country-estate atmosphere with subtle mystery, 3:2 landscape, no UI, no watermark.

---

## 03 — Friends Gathered in the Living Room

**Concept:** The final carefree evening before everything changes.

**Prompt:**

> A cinematic interior view of the grand living room at Blackwood Manor, showing a group of friends gathered casually together before the murder. The people are small within the composition, seen mostly from behind, in profile, or partially obscured by furniture; their faces are never sharply recognizable. They sit and stand around plush Victorian sofas and armchairs beside a large stone fireplace, with antique paintings, bookshelves, lamps, carved wooden furniture and decorative objects surrounding them. The mood is warm, social and relaxed, with golden amber interior lighting and cozy illuminated lamps, while the room remains rich with Victorian detail. No moonlight or eerie blue lighting. Premium detailed 16-bit SNES-era pixel art, painterly pixel clusters, rich colors, visible pixel grid, soft gradient shading, warm cinematic lighting, sophisticated modern pixel-art remaster quality, 3:2 landscape composition, no text, no UI, no watermark.

---

## 04 — The Empty Chair

**Concept:** Morning after the murder: something is terribly wrong.

**Prompt:**

> A cinematic view of the formal dining room at Blackwood Manor immediately after the murder. A long polished Victorian dining table is set for a group breakfast, with porcelain plates, silver cutlery, glasses, coffee cups and half-finished breakfast food, but one prominent chair at the table is completely empty and slightly pulled away from the table. The empty chair should be the emotional focal point. Other chairs are also visible but unoccupied. Pale morning light streams through tall arched windows, creating long shadows across the wooden floor. The room is beautiful and orderly, making the absence feel deeply unsettling. Outside the windows is a bright but slightly overcast blue morning sky. Premium detailed 16-bit SNES-era pixel art, painterly and highly detailed, visible pixel grid, rich Victorian textures, soft gradient daylight, cinematic environmental storytelling, 3:2 landscape, no people, no gore, no text, no UI, no watermark.

---

## 05 — The House Is Sealed

**Concept:** The survivors discover that escape is impossible.

**Prompt:**

> A tense cinematic interior scene inside Blackwood Manor showing several sealed windows and a massive locked exterior door. A pair of old Victorian windows have been firmly latched and reinforced from the inside, while heavy curtains hang motionless beside them. In the foreground, a character's hands are seen attempting to turn an old brass window latch, but the person is mostly outside the frame and their face is not visible. In the background stands an enormous antique wooden door with multiple locks and heavy iron hardware. Warm golden morning daylight enters through the windows but cannot provide a way out. The architecture is ornate gothic Victorian, with dark wood paneling, stone trim and intricate brass fittings. Premium detailed 16-bit SNES-era pixel art, rich painterly pixel clusters, visible pixel grid, soft daylight shading, cinematic tension without gore, 3:2 landscape, no readable text, no UI, no watermark.

---

## 06 — The Sealed Letter

**Concept:** The rules of the Battle Royale are revealed.

**Prompt:**

> A dramatic close environmental shot of an antique study desk inside Blackwood Manor. At the center lies a sealed cream-colored letter opened with a broken dark-red wax seal, its pages covered in dense handwritten script that is deliberately illegible at a glance. The letter is positioned beneath an antique brass desk lamp and beside an old ink bottle, fountain pen, pocket watch and several scattered keys. The desk sits in a shadowy Victorian study with dark wood paneling, bookshelves and a tall arched window. Moody moonlit night lighting fills the room, with deep blue-purple light entering through the window and warm golden light illuminating the desk and letter. Premium detailed 16-bit SNES-era pixel art, painterly pixel clusters, rich color depth, visible pixel grid, atmospheric foggy moonlight, dramatic shadows, cinematic composition, 3:2 landscape, no readable text, no characters, no UI, no watermark.

---

## 07 — The Jar of Votes

**Concept:** The horrifying voting mechanism is discovered.

**Prompt:**

> A cinematic close environmental shot of an antique glass jar positioned on a small wooden table beside the main hallway door of Blackwood Manor. The jar is filled with many tightly folded slips of cream-colored paper, clearly representing anonymous votes, but none of the writing is readable. Beside the jar sits an antique brass bell, a wooden box containing blank paper slips, and an old ink pen. The surrounding hallway is richly Victorian, with dark wooden paneling, patterned wallpaper, framed portraits and a stone floor. Moody moonlit night lighting enters through tall windows, creating deep blue-purple shadows while warm golden candlelight catches the glass jar and folded papers. Premium detailed 16-bit SNES-era pixel art, painterly pixel clusters, visible pixel grid, rich reflections, cinematic atmospheric lighting, 3:2 landscape, no characters, no readable text, no UI, no watermark.

---

## 08 — The Vote at Sunset

**Concept:** The survivors must publicly choose who will be eliminated.

**Prompt:**

> A cinematic wide shot of the survivors gathered tensely in a grand stone hall at Blackwood Manor during the transition into the deadly voting ritual. Several small human figures stand around an old wooden table, their bodies turned toward one another in suspicion, with faces obscured by distance, shadow or profile. At the center is an antique container holding folded voting slips. Tall arched windows reveal the final remnants of daylight fading outside, while the interior is already dominated by dramatic deep blue-purple evening shadows and warm candlelight. The atmosphere is tense rather than action-oriented: rigid body language, distance between people, and silent confrontation communicate distrust. Premium detailed 16-bit SNES-era pixel art, painterly high-fidelity pixel clusters, rich color depth, cinematic dramatic lighting, visible pixel grid, gothic Victorian architecture, 3:2 landscape, no gore, no readable text, no UI, no watermark.

---

## 09 — The Three Doors

**Concept:** The final survivor faces the endgame.

**Prompt:**

> A monumental underground chamber beneath Blackwood Manor containing exactly three imposing ancient wooden doors standing side by side on the far wall, forming the visual centerpiece of the room. Each door is distinctly different but equally mysterious, with ornate Victorian-gothic carvings, heavy iron hardware and faint symbols that are abstract and not readable as text. A single lone survivor stands small in the foreground with their back toward the viewer, facing the three doors. Their face is completely hidden. The chamber is built from ancient dark stone, with cracked masonry, old candles, hanging chains, shallow pools of mist and a worn stone floor. Moody moonlit blue-purple supernatural lighting mixes with warm candlelight, creating dramatic shadows and a mysterious endgame atmosphere. Premium detailed 16-bit SNES-era pixel art, painterly pixel clusters, rich color depth, visible pixel grid, cinematic composition, atmospheric horror without gore, 3:2 landscape, no UI, no watermark.

---

## 10 — The Lone Survivor

**Concept:** The winner finally escapes Blackwood Manor.

**Prompt:**

> A wide cinematic final shot of Blackwood Manor viewed from outside the estate gate at dawn. A lone surviving person walks away from the open wrought-iron gate toward the foreground, carrying a small bag, seen entirely from behind and too far away for any facial details. Blackwood Manor looms behind them, its gothic Victorian stone facade, ivy, turrets, steep slate roofs and ornate chimneys silhouetted against a pale morning sky. The estate looks strangely quiet after the nightmare that occurred inside. The first warm golden rays of sunrise illuminate the mansion and gravel driveway, with soft mist lingering close to the ground. The physical gate plaque reads “BLACKWOOD MANOR.” Premium detailed 16-bit SNES-era pixel art, painterly high-fidelity pixel clusters, visible pixel grid, rich warm sunrise colors, soft atmospheric gradient shading, cinematic emotional composition, 3:2 landscape, no gore, no UI, no watermark.

---

# 2. EXPLOREABLE MANSION ROOMS

## 11 — Entrance Hall

**Concept:** Main navigational hub of Blackwood Manor.

**Prompt:**

> An empty grand entrance hall inside Blackwood Manor, designed as a premium game background. A monumental Victorian chandelier hangs from a high ornate ceiling above a polished wooden floor. A huge carved wooden staircase rises from the center and splits toward the upper floors. Dark stone walls, elaborate wood paneling, tall arched windows, antique portraits, brass fixtures and decorative Victorian furniture fill the space. The entrance doors are visible in the background. No people. Warm golden pre-murder daylight streams through the tall windows, illuminating dust motes and polished surfaces. Premium detailed 16-bit SNES-era pixel art, painterly and richly textured rather than blocky, visible pixel grid, soft gradient shading, sophisticated modern pixel-art remaster quality, gothic Victorian architecture, cinematic symmetrical 3:2 composition, no text, no UI, no watermark.

---

## 12 — Library

**Concept:** Books, clues and hidden-history room.

**Prompt:**

> An empty atmospheric Victorian library inside Blackwood Manor. Floor-to-ceiling wooden bookshelves cover the walls and are filled with hundreds of old leather-bound books. A large stone fireplace dominates one side of the room, with a comfortable reading nook consisting of a worn leather armchair, small side table and reading lamp nearby. A heavy antique desk, globe, ladder and scattered books add environmental storytelling. Tall arched windows illuminate the room with warm golden pre-murder daylight. Rich wood grain, dusty book spines, carved furniture and subtle ivy visible outside the windows reinforce the age of the mansion. Premium detailed 16-bit SNES-era pixel art, painterly high-fidelity pixel clusters, visible pixel grid, rich color depth, soft gradient sunlight, cinematic 3:2 landscape, empty of people, no readable book titles, no UI, no watermark.

---

## 13 — Dining Room

**Concept:** Formal dining area and social gathering location.

**Prompt:**

> An empty grand Victorian dining room inside Blackwood Manor. A very long polished dark-wood dining table stretches through the center of the room, surrounded by ornate high-backed chairs. The table is set with antique porcelain plates, silver cutlery, wine glasses, candlesticks and decorative serving dishes. Tall arched windows, elaborate wallpaper, dark wood paneling, framed ancestral portraits and a large antique sideboard create a luxurious but slightly old-fashioned atmosphere. Warm golden pre-murder daylight pours through the windows and reflects softly across the polished table. Premium detailed 16-bit SNES-era pixel art, painterly pixel clusters, visible pixel grid, rich textures, soft gradient lighting, cinematic symmetrical 3:2 composition, no people, no readable text, no UI, no watermark.

---

## 14 — Kitchen

**Concept:** Practical room containing the locked basement entrance.

**Prompt:**

> An empty spacious Victorian country-house kitchen inside Blackwood Manor. The room contains aged but elegant vintage appliances, a large central wooden island, copper pots and pans, shelves filled with jars and cooking ingredients, a stone countertop, wooden cabinets and a small pantry area. At the back of the kitchen is a conspicuous heavy wooden door reinforced with old iron hardware, clearly locked and leading to the basement. The basement door should feel like an important environmental feature without being supernatural. Warm golden pre-murder daylight enters through a kitchen window, illuminating the stone floor, wood surfaces and metal cookware. Premium detailed 16-bit SNES-era pixel art, painterly high-detail rendering, visible pixel grid, rich colors, soft gradient daylight, Victorian architectural authenticity, cinematic 3:2 landscape, no people, no readable labels, no UI, no watermark.

---

## 15 — Living Room

**Concept:** Main social room.

**Prompt:**

> An empty elegant Victorian living room inside Blackwood Manor. Several plush upholstered sofas and armchairs form a comfortable seating area around a large stone fireplace. The walls contain a collection of ornate antique paintings and portraits. A large rug, carved wooden coffee table, books, lamps, decorative cabinets and small personal objects make the room feel genuinely lived in. Tall arched windows look onto the manor grounds. Warm golden pre-murder daylight fills the room, creating a welcoming contrast with the mansion's gothic architecture. Premium detailed 16-bit SNES-era pixel art, painterly high-fidelity pixel clusters, visible pixel grid, rich color depth, soft gradient sunlight, cinematic environmental storytelling, 3:2 landscape, empty of people, no readable text, no UI, no watermark.

---

## 16 — Ground-Floor Toilet / Murder Scene

**Concept:** The room where the host was found murdered.

**Prompt:**

> An empty old-fashioned Victorian toilet room inside Blackwood Manor, presented as a subtle crime-scene environment without showing a body. The room contains an antique porcelain toilet, small Victorian washbasin, tarnished brass faucet, patterned ceramic wall tiles, dark wooden trim, a tiny frosted window and an old wall mirror. One section of the floor near the toilet contains a small dark bloodstain, restrained and non-graphic, suggesting something terrible happened here. The room is otherwise undisturbed. Moody moonlit night lighting enters through the small window, casting deep blue-purple shadows while a weak warm wall lamp illuminates the porcelain and tile. Premium detailed 16-bit SNES-era pixel art, painterly pixel clusters, rich atmospheric shading, visible pixel grid, cinematic horror through implication rather than gore, 3:2 landscape, no body, no characters, no text, no UI, no watermark.

---

## 17 — Master Bedroom

**Concept:** Luxurious private bedroom containing possible clues.

**Prompt:**

> An empty luxurious Victorian master bedroom inside Blackwood Manor. A large ornate four-poster king-sized bed dominates the room, dressed in rich fabrics and surrounded by carved wooden furniture. A tall wardrobe and partially open walk-in closet are visible, along with a private en-suite bathroom doorway. A writing desk, antique vanity, framed paintings, bedside tables and small personal objects add believable detail. Tall arched windows overlook the estate. Warm golden pre-murder daylight enters through the windows and softly illuminates the rich fabrics, carved wood and stone architectural details. Premium detailed 16-bit SNES-era pixel art, painterly high-fidelity rendering, visible pixel grid, rich colors, soft gradient daylight, sophisticated Victorian gothic interior, cinematic 3:2 landscape, no people, no readable text, no UI, no watermark.

---

## 18 — Guest Bedroom 1

**Concept:** Cozy guest room.

**Prompt:**

> An empty cozy Victorian guest bedroom inside Blackwood Manor. A comfortable queen-sized bed sits against an ornate wallpapered wall, accompanied by a carved wooden dresser, bedside table, small writing desk and antique chair. A modest wardrobe stands near the corner, while framed landscape paintings and small decorative objects add character. Warm golden pre-murder daylight enters through a tall window, illuminating the patterned wallpaper, wooden floor, bedding and antique furniture. The room should feel inviting but old-fashioned, clearly distinct from the luxurious master bedroom. Premium detailed 16-bit SNES-era pixel art, painterly pixel clusters, visible pixel grid, rich color depth, soft gradient sunlight, cinematic game-background composition, 3:2 landscape, empty of people, no readable text, no UI, no watermark.

---

## 19 — Guest Bedroom 2

**Concept:** Twin-bed guest room.

**Prompt:**

> An empty charming Victorian guest bedroom inside Blackwood Manor containing two separate twin beds with old-fashioned carved wooden headboards. Between them is a small bedside table and antique lamp. The room also contains a tall wardrobe, reading chair, small bookshelf, dresser and several framed paintings. A tall window provides warm golden pre-murder daylight, casting soft rectangular light across the wooden floor and beds. The room should have a slightly more modest and personal character than the master bedroom, with rich Victorian details and believable lived-in objects. Premium detailed 16-bit SNES-era pixel art, painterly high-fidelity pixel clusters, visible pixel grid, rich colors, soft gradient daylight, cinematic 3:2 landscape, no people, no readable text, no UI, no watermark.

---

## 20 — Upstairs Bathroom

**Concept:** Shared Victorian bathroom.

**Prompt:**

> An empty elegant Victorian upstairs bathroom inside Blackwood Manor. The room contains a large freestanding clawfoot bathtub, an old-fashioned shower enclosure, porcelain vanity with ornate mirror, brass fixtures, folded towels, ceramic tiles and dark wooden trim. Tall frosted windows allow warm golden pre-murder daylight to enter softly. The bathroom combines luxurious Victorian craftsmanship with the slightly aged character of an old country mansion. Fine reflections appear on the porcelain and brass fixtures. Premium detailed 16-bit SNES-era pixel art, painterly pixel clusters, visible pixel grid, rich color depth, soft gradient daylight, highly detailed environmental textures, cinematic 3:2 landscape, no people, no readable text, no UI, no watermark.

---

## 21 — Locked Second-Floor Study

**Concept:** Unfinished upper-floor study containing future secrets.

**Prompt:**

> An empty unfinished second-floor study inside Blackwood Manor, currently under construction. The room contains exposed sections of old stone and timber, partially completed wooden flooring, stacked construction materials, covered furniture, wooden beams and several unopened crates. At the center is an old writing desk covered with dusty papers and an antique lamp, suggesting that the room once had another purpose. A heavy door with an old brass lock leads into the hallway and clearly indicates that the room is inaccessible. Warm golden pre-murder daylight enters through tall unfinished windows. Premium detailed 16-bit SNES-era pixel art, painterly high-fidelity pixel clusters, visible pixel grid, rich colors, soft gradient daylight, gothic Victorian architecture combined with subtle construction details, cinematic 3:2 landscape, no people, no readable text, no UI, no watermark.

---

## 22 — Attic

**Concept:** Forgotten uppermost level containing the mansion's oldest secrets.

**Prompt:**

> An expansive abandoned Victorian attic beneath the steep roof of Blackwood Manor. Wooden rafters and beams cross the ceiling, with dusty floorboards, old trunks, forgotten furniture, rolled carpets, antique paintings, covered mirrors and stacks of forgotten belongings scattered throughout the space. Small dormer windows reveal the bright blue daytime sky outside. Shafts of warm golden daylight illuminate floating dust particles and create long soft shadows across the floor. The attic should feel mysterious and full of potential secrets while remaining non-horror and non-supernatural. Premium detailed 16-bit SNES-era pixel art, painterly pixel clusters, rich color depth, visible pixel grid, soft gradient sunlight, highly detailed environmental storytelling, cinematic 3:2 landscape, no characters, no readable text, no UI, no watermark.

---

## 23 — Locked Basement Door

**Concept:** The mysterious entrance to the inaccessible basement.

**Prompt:**

> A cinematic environmental shot of the locked basement entrance inside the kitchen of Blackwood Manor. A heavy old wooden door is built into a dark stone wall, reinforced with thick black iron bands and an elaborate antique lock. The door is slightly more weathered than the rest of the mansion and has subtle scratches around the lock suggesting that people have tried to open it before. A small old brass keyhole is clearly visible. The surrounding kitchen fades into the background, emphasizing the basement door as the focal point. Moody moonlit night lighting enters through the nearby kitchen window, casting deep blue-purple shadows while warm interior light falls across the lock and wooden surface. Premium detailed 16-bit SNES-era pixel art, painterly pixel clusters, visible pixel grid, rich textures, atmospheric lighting, cinematic 3:2 landscape, no people, no gore, no readable text, no UI, no watermark.

---

# 3. RECURRING MOTIFS

## 24 — The Ghost in the Hallway

**Concept:** Reusable supernatural silhouette for post-murder screens.

**Prompt:**

> A long empty Victorian hallway inside Blackwood Manor at night. Dark wooden paneling, patterned wallpaper, ornate framed portraits, antique lamps and tall arched windows extend into the distance, creating strong perspective. At the far end of the corridor is a barely visible translucent human-like ghost silhouette standing motionless in the darkness. The spirit is intentionally indistinct, with no recognizable face or sharp features, appearing more like a pale atmospheric silhouette than a detailed person. Deep blue-purple moonlight enters through the windows, mixing with faint warm golden light from old wall lamps. Thin mist hangs close to the floor. Premium detailed 16-bit SNES-era pixel art, painterly high-fidelity pixel clusters, visible pixel grid, rich color depth, dramatic atmospheric shadows, subtle supernatural horror, cinematic 3:2 landscape, no gore, no readable text, no UI, no watermark.

---

## 25 — Blackwood Manor — Day Exterior

**Concept:** Reusable daytime exterior establishing shot.

**Prompt:**

> A grand symmetrical exterior establishing shot of Blackwood Manor on a beautiful sunny day. The mansion is an imposing gothic Victorian English country estate constructed from warm gray stone with green ivy climbing across the facade, steep slate roofs, ornate brick-and-stone chimneys, dormer windows, decorative turrets and numerous tall arched windows. A grand central entrance sits at the top of broad stone stairs. In the foreground is an open wrought-iron gate between two stone pillars, with a gravel driveway leading toward the mansion, trimmed hedges, flowering shrubs and mature trees framing the composition. The gate bears a physical plaque reading “BLACKWOOD MANOR.” Bright blue sky, soft white clouds and warm golden sunlight illuminate the entire estate. Premium detailed 16-bit SNES-era / modern pixel-art-remaster style, painterly pixel clusters rather than crude blocky pixels, visible pixel grid, rich color depth, soft gradient shading, cinematic symmetrical 3:2 landscape, inviting English gothic atmosphere, no people, no UI, no watermark.

---

## 26 — Blackwood Manor — Night Exterior

**Concept:** Reusable post-murder exterior establishing shot.

**Prompt:**

> A grand symmetrical exterior establishing shot of Blackwood Manor at night, using the exact same architecture and composition as an established daytime version of the estate. The mansion is an imposing gothic Victorian English country estate constructed from dark warm-gray stone with green ivy climbing across the facade, steep slate roofs, ornate chimneys, dormer windows, decorative turrets and numerous tall arched windows. Warm light glows from selected windows while the surrounding mansion remains partially swallowed by dramatic shadows. In the foreground is an open wrought-iron gate between two stone pillars, with a gravel driveway leading toward the central entrance, trimmed hedges and twisted mature trees framing the composition. The gate bears a physical plaque reading “BLACKWOOD MANOR.” Deep blue-purple night sky, large pale moon, drifting fog and subtle atmospheric haze create a mysterious post-murder mood. Premium detailed 16-bit SNES-era / modern pixel-art-remaster style, painterly pixel clusters, visible pixel grid, rich color depth, soft gradient moonlight, cinematic symmetrical 3:2 landscape, no people, no gore, no UI, no watermark.

---

## 27 — Bloodstained Toilet Tile

**Concept:** Reusable close-up crime-scene detail.

**Prompt:**

> An extreme environmental close-up of old ceramic floor tiles inside the Victorian ground-floor toilet at Blackwood Manor. The composition focuses on a small restrained dark bloodstain spreading across several aged cream-and-gray patterned tiles, with subtle cracks, dirt and worn grout visible in exquisite pixel-art detail. The edge of an antique porcelain toilet is partially visible at the top of the frame, providing context without showing any body. No weapon and no graphic gore. Moody moonlit night lighting creates deep blue-purple shadows across the tiles while a weak warm wall lamp produces a small reflection on the glossy ceramic surface. Premium detailed 16-bit SNES-era pixel art, painterly high-fidelity pixel clusters, visible pixel grid, rich color depth, cinematic macro environmental storytelling, horror conveyed entirely through implication, 3:2 landscape, no characters, no readable text, no UI, no watermark.

