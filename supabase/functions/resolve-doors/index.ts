import { errorResponse, jsonResponse, preflightResponse, readJsonBody } from "../_shared/http.ts";
import { requireCronOrGmForGame } from "../_shared/auth.ts";
import { sql } from "../_shared/db.ts";
import type { Game } from "../_shared/types.ts";

// Scheduled function, deliberately separate from resolve-round (per user decision):
// Three Doors (game-design v0.9 section 14) is a single per-game event with its own
// collision-detection algorithm, not a round-deadline vote tally. Invoked either by
// cron (x-cron-secret, unscoped or scoped by body.game_id) or by a GM's own "Resolve
// doors" click (bearer token, hard-scoped to their game) -- same dual path as
// resolve-round.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const body = await readJsonBody<Record<string, unknown>>(req).catch(() => ({}) as Record<string, unknown>);
    const bodyGameId = typeof body.game_id === "string" ? body.game_id : undefined;
    const scopedGameId = await requireCronOrGmForGame(req, bodyGameId);

    const db = sql();
    const activeDoorGames = scopedGameId
      ? await db<Game[]>`select * from battle_royale.games where phase = 'three_doors' and id = ${scopedGameId}`
      : await db<Game[]>`select * from battle_royale.games where phase = 'three_doors'`;

    let resolvedCount = 0;

    for (const game of activeDoorGames) {
      // role = 'player' -- the GM's own row is also status = 'alive' (never
      // eliminated), but the GM never submits a door pick (submit-door-pick requires
      // role 'player'), so leaving this unfiltered meant picks.length could never
      // reach alivePlayers.length and no game could ever resolve.
      const alivePlayers = await db<{ id: string }[]>`
        select id from battle_royale.players where game_id = ${game.id} and status = 'alive' and role = 'player'
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
