This is a mini game, which the GM can optionally include to the main game, when setting up the game.

Using the information from the mansion.md, a grid map needs to be build to represent the layout of the mansion for the mini-game. The grid map will help players visualize the different rooms and their locations within the mansion. Below is a suggested grid layout for version 1.0 of the game:

**Visualization -- resolved: pixel-frame grid, not Vuetify.** A plain CSS Grid of
`.pixel-frame` cells (the same bordered-panel style used everywhere else in the app)
laid out to match the mansion's actual floor adjacency, with occupancy represented
as a brightness/opacity step on the existing `--nbr-accent` color token rather than
a full heatmap color scale/component. Reasoning: the rest of the app is a
hand-rolled 90s pixel-arcade style with zero UI framework dependency (no Vuetify
anywhere) -- pulling one in for a single grid would clash visually and add a heavy
dependency for one component. It also avoids a real ambiguity in reusing color for
two different things: mansion.md already gives each room its own *thematic* color
(the Toilet's "dark red scale," the Attic's "yellow scale," etc.), which would
collide visually with using color intensity for *occupancy* too -- those stay two
separate visual channels, not one.

Each floor will have a grid representation, with each room as a cell. Occupancy
(more people in a room = more visually "hot") is shown per the visualization
decision above. The grid also includes labels for each room, making it easy for
players to identify their current location and plan their next move.

When the game starts each player will be in the Toilet, where the body was found, and the interactive game actually begins. 
After each round, players will see all floor charts, with the color representations, but no labels (needs to be secret where each player is), they only see their own name/icon/label in the cell they are in.
Players will have the option to move to a different room, adjacent to the room they are currently in, or stay in the same room.
They can only move 1 space vertically or horizontally, not diagonally.
The result all player move will be revealed in the next round, in the updated pixel-frame grid.

After a player has moved, they will be prompted a question <Where do you think <RandomStillAlivePlayerName> is?>. This player is still alive and in the game, and will need to guess which room that player is currently occupying.
If they guess correctly, they will earn a point. 
This way players stay engaged because they want to keep track of where other players are moving and try to guess their locations.

## Player UI: the Move screen

When this mini-game is enabled by the GM, every player gets a **Move** button in
their hub (the same area `PlayerSettingsModal`'s Settings button lives in on the
main round screen). Tapping it opens a dedicated screen:

- **Rules text** at the top -- plain-language explanation of the movement
  constraint (move to one adjacent room only, horizontal or vertical, never
  diagonal, or stay put).
- **The floor blueprint** (see visualization discussion above), with only rooms
  actually adjacent to the player's current room shown as clickable/active -- every
  other cell is inert, not a dead-end trap for misclicks.
- **Your own position** is marked distinctly (a circle/marker with your own
  name or identifier) on the cell you currently occupy. No other player's position
  is shown anywhere on this screen, consistent with "no labels" above -- this is
  your own private view of the board, not a shared one.
- **Selecting** an adjacent room highlights it, but doesn't move you yet.
- A separate **Confirm move** button commits the selection. Nothing happens until
  that's pressed -- an accidental tap on a room doesn't lock anything in.
- **Moving is entirely optional.** A player can leave this screen (or just never
  open it) without picking anything, equivalent to staying in their current room.

## GM Setup integration

Same pattern established in `russian-roulette.md`: opt-in via a general "Enable
mini-games" toggle in GM Setup, with this mini-game getting its own settings block
underneath rather than loose top-level fields. No specific GM-configurable settings
are actually enumerated in this doc yet (unlike Russian Roulette's bullet
count/reset mode/end condition), so there's nothing to check for conflicts today --
noted so that whenever this gets fleshed out with real settings, any combination    
that could contradict another gets prevented at the GM Setup UI itself, not saved
as an invalid state and discovered later.
