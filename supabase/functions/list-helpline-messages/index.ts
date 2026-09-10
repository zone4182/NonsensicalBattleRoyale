import { errorResponse, jsonResponse, preflightResponse } from "../_shared/http.ts";
import { authenticate } from "../_shared/auth.ts";
import { sql } from "../_shared/db.ts";
import { gmName, publicName } from "../_shared/names.ts";
import type { HelplineMessage } from "../_shared/types.ts";

// A player only ever sees their own thread(s) with the GM (never another player's --
// this is a private player<->GM channel, same boundary as helpline-message/index.ts).
// The GM sees every thread across the whole game, with per-message sender identity so
// the frontend can group by player and filter -- GM-formatted names (invite name, with
// the player's own chosen name in parentheses) same as gm-game-overview.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const ctx = await authenticate(req);
    const db = sql();

    if (ctx.role === "gm") {
      const messages = await db<HelplineMessage[]>`
        select * from battle_royale.helpline_messages
        where game_id = ${ctx.game.id}
        order by created_at asc
      `;

      const players = await db<{ id: string; display_name: string; chosen_display_name: string | null }[]>`
        select id, display_name, chosen_display_name from battle_royale.players where game_id = ${ctx.game.id}
      `;
      const nameById = new Map(players.map((p) => [p.id, gmName(p.display_name, p.chosen_display_name)]));

      return jsonResponse({
        messages: messages.map((m) => ({
          id: m.id,
          player_id: m.player_id,
          player_display_name: nameById.get(m.player_id) ?? "unknown",
          sender_role: m.sender_role,
          body: m.body,
          in_reply_to: m.in_reply_to,
          created_at: m.created_at,
        })),
      });
    }

    const messages = await db<HelplineMessage[]>`
      select * from battle_royale.helpline_messages
      where game_id = ${ctx.game.id} and player_id = ${ctx.player.id}
      order by created_at asc
    `;

    return jsonResponse({
      messages: messages.map((m) => ({
        id: m.id,
        player_id: m.player_id,
        player_display_name: publicName(ctx.player.display_name, ctx.player.chosen_display_name),
        sender_role: m.sender_role,
        body: m.body,
        in_reply_to: m.in_reply_to,
        created_at: m.created_at,
      })),
    });
  } catch (err) {
    return errorResponse(err);
  }
});
