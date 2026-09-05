import { errorResponse, HttpError, jsonResponse, preflightResponse, readJsonBody } from "../_shared/http.ts";
import { authenticate, requireRole } from "../_shared/auth.ts";
import { sql } from "../_shared/db.ts";
import { requireString } from "../_shared/validation.ts";
import { generateInviteToken } from "../_shared/tokens.ts";

// GM-only. Restricted to the setup phase -- an invite added after Round 1 starts
// would be a dead invite anyway, per the no-show exclusion rule (game-design v0.9
// §3a). The GM copies the returned token/link and sends it manually; there is no
// email/WhatsApp sending in this stack (confirmed with the user).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const ctx = await authenticate(req);
    requireRole(ctx, "gm");

    if (ctx.game.phase !== "setup") {
      throw new HttpError(409, "not_in_setup", "Invites can only be created while the game is in setup.");
    }

    const body = await readJsonBody<Record<string, unknown>>(req);
    const displayName = requireString(body, "display_name");

    const token = generateInviteToken();
    const [invite] = await sql()`
      insert into battle_royale.invites (game_id, token, display_name, role)
      values (${ctx.game.id}, ${token}, ${displayName}, 'player')
      returning id
    `;

    return jsonResponse({ invite_id: invite.id, token, display_name: displayName }, 201);
  } catch (err) {
    return errorResponse(err);
  }
});
