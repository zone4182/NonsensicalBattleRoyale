import { errorResponse, jsonResponse, preflightResponse } from "../_shared/http.ts";
import { authenticate, requireRole } from "../_shared/auth.ts";
import { sql } from "../_shared/db.ts";
import type { Invite } from "../_shared/types.ts";

// GM-only. Readable anytime, unlike create-invite -- no phase restriction, matching
// get-game-state's always-readable pattern. Never returns the token: tokens are only
// ever shown once, at creation (same stance as create-game's gm_invite_token).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const ctx = await authenticate(req);
    requireRole(ctx, "gm");

    const invites = await sql()<Invite[]>`
      select id, display_name, role, redeemed_at, created_at from battle_royale.invites
      where game_id = ${ctx.game.id}
      order by created_at asc
    `;

    return jsonResponse({
      invites: invites.map((i) => ({
        id: i.id,
        display_name: i.display_name,
        role: i.role,
        redeemed_at: i.redeemed_at,
      })),
    });
  } catch (err) {
    return errorResponse(err);
  }
});
