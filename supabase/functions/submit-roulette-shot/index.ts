import { errorResponse, HttpError, jsonResponse, preflightResponse, readJsonBody } from "../_shared/http.ts";
import { authenticate, requireAlive, requireRole } from "../_shared/auth.ts";
import { sql } from "../_shared/db.ts";
import { applyRouletteShot, advanceRouletteBotTurns } from "../_shared/endgame.ts";
import { publicName } from "../_shared/names.ts";
import type { Player, RouletteState } from "../_shared/types.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const ctx = await authenticate(req);
    requireRole(ctx, "player");
    requireAlive(ctx);

    if (ctx.game.phase !== "russian_roulette") {
      throw new HttpError(409, "not_roulette_phase", "The Russian Roulette endgame is not currently active.");
    }

    const body = await readJsonBody<Record<string, unknown>>(req);
    const targetPlayerId = body.target_player_id;
    if (typeof targetPlayerId !== "string") {
      throw new HttpError(400, "invalid_target", "target_player_id must be the caller's own id or another alive player's id.");
    }

    const db = sql();
    const result = await db.begin(async (tx) => {
      const [state] = await tx<RouletteState[]>`
        select * from battle_royale.roulette_state where game_id = ${ctx.game.id} for update
      `;
      if (!state) throw new HttpError(409, "not_roulette_phase", "The Russian Roulette endgame is not currently active.");

      const currentId = state.turn_order[state.current_turn_index];
      if (currentId !== ctx.player.id) {
        throw new HttpError(403, "not_your_turn", "It is not currently your turn.");
      }

      const isSelf = targetPlayerId === ctx.player.id;
      const forcedSelf = state.forced_self_only_player_ids.includes(ctx.player.id);
      if (forcedSelf && !isSelf) {
        throw new HttpError(
          409,
          "forced_self_target",
          "You missed a shot at someone else last time -- this turn you can only aim at yourself.",
        );
      }
      if (!isSelf && !state.turn_order.includes(targetPlayerId)) {
        throw new HttpError(400, "invalid_target", "target_player_id must be the caller's own id or another currently alive player's id.");
      }

      const roster = await tx<Player[]>`
        select * from battle_royale.players where game_id = ${ctx.game.id} and status = 'alive' and role = 'player'
      `;
      const nameById = new Map(roster.map((p) => [p.id, publicName(p.display_name, p.chosen_display_name)]));

      const shotResult = await applyRouletteShot(tx, ctx.game, nameById, ctx.player.id, targetPlayerId);

      if (!shotResult.gameEnded) {
        const rosterAfter = await tx<Player[]>`
          select * from battle_royale.players where game_id = ${ctx.game.id} and status = 'alive' and role = 'player'
        `;
        await advanceRouletteBotTurns(tx, ctx.game, rosterAfter);
      }

      const [game] = await tx<{ phase: string }[]>`select phase from battle_royale.games where id = ${ctx.game.id}`;
      return { hit: shotResult.hit, is_self: isSelf, phase: game.phase };
    });

    return jsonResponse({ ok: true, ...result });
  } catch (err) {
    return errorResponse(err);
  }
});
