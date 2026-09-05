import { errorResponse, jsonResponse, preflightResponse } from "../_shared/http.ts";
import { requireCronSecret } from "../_shared/auth.ts";
import { sql } from "../_shared/db.ts";
import type { Game } from "../_shared/types.ts";

// Scheduled function, deliberately separate from resolve-round (per user decision):
// Three Doors (game-design v0.9 section 14) is a single per-game event with its own
// collision-detection algorithm, not a round-deadline vote tally.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    requireCronSecret(req);

    const db = sql();
    const activeDoorGames = await db<Game[]>`
      select * from battle_royale.games where phase = 'three_doors'
    `;

    let resolvedCount = 0;

    for (const game of activeDoorGames) {
      const alivePlayers = await db<{ id: string }[]>`
        select id from battle_royale.players where game_id = ${game.id} and status = 'alive'
      `;
      const picks = await db<{ player_id: string; door_number: number }[]>`
        select player_id, door_number from battle_royale.door_picks
        where game_id = ${game.id} and resolved_outcome is null
      `;

      // Only resolve once every remaining player has picked.
      if (picks.length < alivePlayers.length) continue;

      const doorNumbers = picks.map((p) => p.door_number);
      const hasCollision = new Set(doorNumbers).size !== doorNumbers.length;

      await db.begin(async (tx) => {
        if (hasCollision) {
          await tx`
            update battle_royale.door_picks set resolved_outcome = 'lose_all'
            where game_id = ${game.id} and resolved_outcome is null
          `;
        } else {
          await tx`
            update battle_royale.door_picks set resolved_outcome = 'win'
            where game_id = ${game.id} and resolved_outcome is null
          `;
        }
        await tx`
          update battle_royale.games set phase = 'ended' where id = ${game.id}
        `;
      });

      resolvedCount++;
    }

    return jsonResponse({ resolved_count: resolvedCount });
  } catch (err) {
    return errorResponse(err);
  }
});
