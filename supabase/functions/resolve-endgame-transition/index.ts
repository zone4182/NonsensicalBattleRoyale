import { errorResponse, jsonResponse, preflightResponse, readJsonBody } from "../_shared/http.ts";
import { requireCronOrGmForGame } from "../_shared/auth.ts";
import { sql } from "../_shared/db.ts";
import { maybeBeginRealEndgame } from "../_shared/endgame.ts";
import type { Game } from "../_shared/types.ts";

// Deadline fallback for the shared endgame-transition screen -- same dual cron/GM path
// as resolve-round and resolve-doors. maybeBeginRealEndgame itself checks whether the
// deadline has actually passed (or everyone's already acked), so a GM's own click
// here behaves exactly like a "Resolve now": it only ever acts once genuinely due,
// same fairness guarantee every other GM-triggered resolution already has.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const body = await readJsonBody<Record<string, unknown>>(req).catch(() => ({}) as Record<string, unknown>);
    const bodyGameId = typeof body.game_id === "string" ? body.game_id : undefined;
    const scopedGameId = await requireCronOrGmForGame(req, bodyGameId);

    const db = sql();
    const games = scopedGameId
      ? await db<Game[]>`select * from battle_royale.games where id = ${scopedGameId} and phase = 'endgame_transition'`
      : await db<Game[]>`select * from battle_royale.games where phase = 'endgame_transition'`;

    let resolvedCount = 0;
    for (const game of games) {
      const phase = await db.begin(async (tx) => {
        const [locked] = await tx<Game[]>`select * from battle_royale.games where id = ${game.id} for update`;
        return await maybeBeginRealEndgame(tx, locked);
      });
      if (phase !== "endgame_transition") resolvedCount++;
    }

    return jsonResponse({ resolved_count: resolvedCount });
  } catch (err) {
    return errorResponse(err);
  }
});
