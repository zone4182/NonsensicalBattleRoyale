import { errorResponse, HttpError, jsonResponse, preflightResponse } from "../_shared/http.ts";
import { authenticate, requireRole } from "../_shared/auth.ts";
import { sql } from "../_shared/db.ts";

// GM-only. Administrative closure, independent of game.phase -- distinct from the
// natural game-end (phase 'ended', via elimination or Three Doors): this is the GM
// explicitly declaring they're done with this game, whether it concluded naturally or
// they're abandoning it early. Once set, resolve-round's and resolve-doors' unscoped
// cron sweeps skip this game entirely, so nothing keeps ticking on it in the
// background. No historical/archive view of a finished game yet -- deliberately
// deferred, per the user.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const ctx = await authenticate(req);
    requireRole(ctx, "gm");

    if (ctx.game.finished_at) {
      throw new HttpError(409, "already_finished", "This game has already been marked finished.");
    }

    const [row] = await sql()`
      update battle_royale.games set finished_at = now() where id = ${ctx.game.id}
      returning finished_at
    `;

    return jsonResponse({ finished_at: row.finished_at });
  } catch (err) {
    return errorResponse(err);
  }
});
