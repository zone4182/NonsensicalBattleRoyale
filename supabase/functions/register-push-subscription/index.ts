import { errorResponse, HttpError, jsonResponse, preflightResponse, readJsonBody } from "../_shared/http.ts";
import { authenticate } from "../_shared/auth.ts";
import { sql } from "../_shared/db.ts";
import { requireString } from "../_shared/validation.ts";

// Any authenticated role can subscribe -- only players currently get anything pushed
// to them (see send-notifications and the round-start notify calls), but there's no
// reason to gate this endpoint itself by role. One row per browser/device endpoint;
// re-subscribing the same endpoint (e.g. the push service rotated it) just replaces
// the stored keys and re-parents it to whichever player owns this token now.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const ctx = await authenticate(req);
    const body = await readJsonBody<Record<string, unknown>>(req);
    const endpoint = requireString(body, "endpoint");
    const keys = body.keys as Record<string, unknown> | undefined;
    if (!keys || typeof keys !== "object") {
      throw new HttpError(400, "invalid_field", "'keys' must be an object.");
    }
    const p256dh = requireString(keys, "p256dh");
    const auth = requireString(keys, "auth");

    const db = sql();
    await db`
      insert into battle_royale.push_subscriptions (player_id, endpoint, p256dh, auth)
      values (${ctx.player.id}, ${endpoint}, ${p256dh}, ${auth})
      on conflict (endpoint) do update set player_id = excluded.player_id, p256dh = excluded.p256dh, auth = excluded.auth
    `;

    return jsonResponse({ ok: true }, 201);
  } catch (err) {
    return errorResponse(err);
  }
});
