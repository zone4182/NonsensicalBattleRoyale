import { errorResponse, HttpError, jsonResponse, preflightResponse, readJsonBody } from "../_shared/http.ts";
import { authenticate, requireRole } from "../_shared/auth.ts";
import { sql } from "../_shared/db.ts";
import { requireString } from "../_shared/validation.ts";
import type { Round } from "../_shared/types.ts";

// Cosmetic, non-anonymous by design (game-design v0.9 section 10) -- majority/tie
// resolution happens server-side in resolve-round, not here.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const ctx = await authenticate(req);
    requireRole(ctx, "player");
    if (ctx.player.status !== "ghost") {
      throw new HttpError(403, "not_a_ghost", "Only ghosts can cast a Seance vote.");
    }

    const body = await readJsonBody<Record<string, unknown>>(req);
    const narrationOption = requireString(body, "narration_option");

    const db = sql();
    const rounds = await db<Round[]>`
      select * from battle_royale.rounds
      where game_id = ${ctx.game.id} and resolved_at is null
      order by round_number desc
      limit 1
    `;
    const round = rounds[0];
    if (!round) {
      throw new HttpError(409, "no_open_round", "There is no open round to cast a Seance vote for.");
    }

    await db`
      insert into battle_royale.seance_votes (round_id, ghost_player_id, narration_option)
      values (${round.id}, ${ctx.player.id}, ${narrationOption})
      on conflict (round_id, ghost_player_id)
      do update set narration_option = excluded.narration_option, cast_at = now()
    `;

    return jsonResponse({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
});
