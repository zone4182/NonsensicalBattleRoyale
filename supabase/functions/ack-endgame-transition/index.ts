import { errorResponse, HttpError, jsonResponse, preflightResponse } from "../_shared/http.ts";
import { authenticate, requireAlive, requireRole } from "../_shared/auth.ts";
import { sql } from "../_shared/db.ts";
import { maybeBeginRealEndgame } from "../_shared/endgame.ts";

// One of the exactly-3 finalists clicking Continue on the shared endgame-transition
// screen (concept/mini-games/russian-roulette-endgame.md). Idempotent -- re-clicking
// after already acking is a no-op, not an error, since the screen has no reason to
// disable itself client-side once clicked.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const ctx = await authenticate(req);
    requireRole(ctx, "player");
    requireAlive(ctx);

    if (ctx.game.phase !== "endgame_transition") {
      throw new HttpError(409, "not_endgame_transition_phase", "The endgame transition is not currently active.");
    }

    const db = sql();
    const phase = await db.begin(async (tx) => {
      await tx`
        update battle_royale.players set endgame_transition_acked_at = coalesce(endgame_transition_acked_at, now())
        where id = ${ctx.player.id}
      `;
      return await maybeBeginRealEndgame(tx, ctx.game);
    });

    return jsonResponse({ ok: true, phase });
  } catch (err) {
    return errorResponse(err);
  }
});
