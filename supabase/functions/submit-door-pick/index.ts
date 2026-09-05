import { errorResponse, HttpError, jsonResponse, preflightResponse, readJsonBody } from "../_shared/http.ts";
import { authenticate, requireAlive, requireRole } from "../_shared/auth.ts";
import { sql } from "../_shared/db.ts";

// Kept separate from submit-vote (per user decision): different validation shape and a
// different resolution algorithm (collision-detect, not top-vote tally) -- resolved by
// resolve-doors, not here.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const ctx = await authenticate(req);
    requireRole(ctx, "player");
    requireAlive(ctx);

    if (ctx.game.phase !== "three_doors") {
      throw new HttpError(409, "not_three_doors_phase", "The Three Doors endgame is not currently active.");
    }

    const body = await readJsonBody<Record<string, unknown>>(req);
    const doorNumber = body.door_number;
    if (typeof doorNumber !== "number" || ![1, 2, 3].includes(doorNumber)) {
      throw new HttpError(400, "invalid_door_number", "door_number must be 1, 2, or 3.");
    }

    const db = sql();
    await db`
      insert into battle_royale.door_picks (game_id, player_id, door_number)
      values (${ctx.game.id}, ${ctx.player.id}, ${doorNumber})
      on conflict (game_id, player_id)
      do update set door_number = excluded.door_number, picked_at = now()
      where battle_royale.door_picks.resolved_outcome is null
    `;

    return jsonResponse({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
});
