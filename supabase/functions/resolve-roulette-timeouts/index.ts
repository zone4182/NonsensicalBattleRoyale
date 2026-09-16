import { errorResponse, jsonResponse, preflightResponse, readJsonBody } from "../_shared/http.ts";
import { requireCronOrGmForGame } from "../_shared/auth.ts";
import { sql } from "../_shared/db.ts";
import { applyRouletteShot, advanceRouletteBotTurns } from "../_shared/endgame.ts";
import { publicName } from "../_shared/names.ts";
import type { Game, Player, RouletteState } from "../_shared/types.ts";

// Per-turn deadline fallback (concept/mini-games/russian-roulette-endgame.md) -- same
// dual cron/GM path as resolve-round/resolve-doors. A player who hasn't acted by their
// turn's deadline gets an automatic self-shot on their behalf, same "a timeout still
// has a real consequence, not a free pass" principle as a missed vote.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const body = await readJsonBody<Record<string, unknown>>(req).catch(() => ({}) as Record<string, unknown>);
    const bodyGameId = typeof body.game_id === "string" ? body.game_id : undefined;
    const scopedGameId = await requireCronOrGmForGame(req, bodyGameId);

    const db = sql();
    const games = scopedGameId
      ? await db<Game[]>`select * from battle_royale.games where id = ${scopedGameId} and phase = 'russian_roulette'`
      : await db<Game[]>`select * from battle_royale.games where phase = 'russian_roulette'`;

    let resolvedCount = 0;
    for (const game of games) {
      const acted = await db.begin(async (tx) => {
        const [state] = await tx<RouletteState[]>`
          select * from battle_royale.roulette_state where game_id = ${game.id} for update
        `;
        if (!state || !state.current_turn_deadline_at) return false;
        if (Date.now() < new Date(state.current_turn_deadline_at).getTime()) return false;

        const currentId = state.turn_order[state.current_turn_index];
        if (!currentId) return false;

        const roster = await tx<Player[]>`
          select * from battle_royale.players where game_id = ${game.id} and status = 'alive' and role = 'player'
        `;
        const nameById = new Map(roster.map((p) => [p.id, publicName(p.display_name, p.chosen_display_name)]));

        const result = await applyRouletteShot(tx, game, nameById, currentId, currentId);
        if (!result.gameEnded) {
          const rosterAfter = await tx<Player[]>`
            select * from battle_royale.players where game_id = ${game.id} and status = 'alive' and role = 'player'
          `;
          await advanceRouletteBotTurns(tx, game, rosterAfter);
        }
        return true;
      });
      if (acted) resolvedCount++;
    }

    return jsonResponse({ resolved_count: resolvedCount });
  } catch (err) {
    return errorResponse(err);
  }
});
