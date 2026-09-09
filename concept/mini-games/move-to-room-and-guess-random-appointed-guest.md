This is a mini game, which the GM can optionally include to the main game, when setting up the game.

Using the information from the mansion.md, a grid map needs to be build to represent the layout of the mansion for the mini-game. The grid map will help players visualize the different rooms and their locations within the mansion. Below is a suggested grid layout for version 1.0 of the game:

The grids need to be build up using:
https://vuetifyjs.com/en/components/heatmaps

Each floor will have a heatmap grid representation, with each room represented as a cell in the grid. 
The cells will be using the in mansion.md mentioned color scales.
The more people are in a room, the darker the color of the cell will be, indicating higher occupancy. The grid will also include labels for each room, making it easy for players to identify their current location and plan their next move.

When the game starts each player will be in the Entrance Hall. 
After each round, players will see all floor charts, with the color representations, but no labels (needs to be secret where each player is), they only see their own name/icon/label in the cell they are in.
Players will have the option to move to a different room, adjacent to the room they are currently in, or stay in the same room.
They can only move 1 space vertically or horizontally, not diagonally.
The result all player move will be revealed in the next round, in the updated heatmap grid.

After a player has moved, they will be prompted a question <Where do you think <RandomStillAlivePlayerName> is?>. This player is still alive and in the game, and will need to guess which room that player is currently occupying.
If they guess correctly, they will earn a point. 
This way players stay engaged because they want to keep track of where other players are moving and try to guess their locations.
