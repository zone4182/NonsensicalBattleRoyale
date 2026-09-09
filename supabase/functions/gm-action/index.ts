import { errorResponse, HttpError, jsonResponse, preflightResponse, readJsonBody } from "../_shared/http.ts";
import { authenticate, requireRole } from "../_shared/auth.ts";
import { sql } from "../_shared/db.ts";
import { grantPower } from "../_shared/powers.ts";
import { requireString } from "../_shared/validation.ts";

// Single entry point for all GM authority (tie-breaks, grants, twists, narration
// edits) -- every call is logged here. Only `grant_power` has real dispatch behind it
// so far -- other action types (the twist catalogue is explicitly undesigned, per
// game-design v0.9 sections 12.2/13) are still just logged.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const ctx = await authenticate(req);
    requireRole(ctx, "gm");

    const body = await readJsonBody<Record<string, unknown>>(req);
    const actionType = requireString(body, "action_type");
    const payload = (body.payload && typeof body.payload === "object" ? body.payload : {}) as Record<string, unknown>;
    const roundId = typeof body.round_id === "string" ? body.round_id : null;

    const db = sql();

    const actionId = await db.begin(async (tx) => {
      if (actionType === "grant_power") {
        const powerKey = requireString(payload, "power_key");
        const targetPlayerId = requireString(payload, "target_player_id");

        const [setting] = await tx`
          select enabled from battle_royale.game_power_settings
          where game_id = ${ctx.game.id} and power_key = ${powerKey}
        `;
        if (!setting) {
          throw new HttpError(400, "unknown_power", "No such power exists.");
        }
        if (!setting.enabled) {
          throw new HttpError(400, "power_not_enabled", "This power is disabled for this game.");
        }

        const [target] = await tx`
          select id from battle_royale.players
          where id = ${targetPlayerId} and game_id = ${ctx.game.id} and status = 'alive' and role = 'player'
        `;
        if (!target) {
          throw new HttpError(400, "invalid_target", "Target must be an alive player in this game.");
        }
      }

      const [action] = await tx`
        insert into battle_royale.gm_actions (game_id, round_id, gm_player_id, action_type, payload)
        values (${ctx.game.id}, ${roundId}, ${ctx.player.id}, ${actionType}, ${tx.json(payload)})
        returning id
      `;

      if (actionType === "grant_power") {
        await grantPower(tx, {
          gameId: ctx.game.id,
          roundId,
          powerKey: payload.power_key as string,
          playerId: payload.target_player_id as string,
          method: "gm_grant",
          gmActionId: action.id,
        });
      }

      return action.id as string;
    });

    return jsonResponse({ gm_action_id: actionId }, 201);
  } catch (err) {
    return errorResponse(err);
  }
});
