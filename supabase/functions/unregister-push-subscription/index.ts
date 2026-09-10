import { errorResponse, jsonResponse, preflightResponse, readJsonBody } from "../_shared/http.ts";
import { authenticate } from "../_shared/auth.ts";
import { sql } from "../_shared/db.ts";
import { requireString } from "../_shared/validation.ts";

// Scoped to the caller's own player id -- a player can only ever remove their own
// subscription, never anyone else's, even though endpoint alone is already unique.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const ctx = await authenticate(req);
    const body = await readJsonBody<Record<string, unknown>>(req);
    const endpoint = requireString(body, "endpoint");

    const db = sql();
    await db`
      delete from battle_royale.push_subscriptions where endpoint = ${endpoint} and player_id = ${ctx.player.id}
    `;

    return jsonResponse({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
});
