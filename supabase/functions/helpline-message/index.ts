import { errorResponse, HttpError, jsonResponse, preflightResponse, readJsonBody } from "../_shared/http.ts";
import { authenticate } from "../_shared/auth.ts";
import { sql } from "../_shared/db.ts";
import { requireString } from "../_shared/validation.ts";
import type { HelplineMessage } from "../_shared/types.ts";

// Private player-to-GM channel only (game-design v0.9 section 11) -- never
// player-to-player.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const ctx = await authenticate(req);

    const body = await readJsonBody<Record<string, unknown>>(req);
    const messageBody = requireString(body, "body");
    const inReplyTo = typeof body.in_reply_to === "string" ? body.in_reply_to : null;

    const db = sql();

    // player_id always identifies whose helpline thread this belongs to -- for a GM
    // reply, it's the id of the player who asked the original question, not the GM.
    let threadPlayerId = ctx.player.id;

    if (ctx.role === "gm") {
      if (!inReplyTo) {
        throw new HttpError(400, "reply_required", "A GM message must set in_reply_to.");
      }
      const originals = await db<HelplineMessage[]>`
        select * from battle_royale.helpline_messages
        where id = ${inReplyTo} and game_id = ${ctx.game.id}
      `;
      const original = originals[0];
      if (!original) {
        throw new HttpError(400, "invalid_reply_target", "in_reply_to does not reference a message in this game.");
      }
      threadPlayerId = original.player_id;
    }

    const [message] = await db`
      insert into battle_royale.helpline_messages (game_id, player_id, sender_role, body, in_reply_to)
      values (${ctx.game.id}, ${threadPlayerId}, ${ctx.role}, ${messageBody}, ${inReplyTo})
      returning id
    `;

    return jsonResponse({ message_id: message.id }, 201);
  } catch (err) {
    return errorResponse(err);
  }
});
