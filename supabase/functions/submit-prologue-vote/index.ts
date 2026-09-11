import { errorResponse, HttpError, jsonResponse, preflightResponse, readJsonBody } from "../_shared/http.ts";
import { authenticate, requireAlive, requireRole } from "../_shared/auth.ts";
import { sql } from "../_shared/db.ts";
import { requireOneOf } from "../_shared/validation.ts";
import { PROLOGUE_OPTIONS } from "../_shared/story.ts";
import type { Round } from "../_shared/types.ts";

// Round 1's group decision -- deliberately its own table/endpoint, not the anonymity-
// critical `votes` table (this isn't "who do you want eliminated", it's a group action
// choice, and there's no reason to hide who picked what). Re-submittable until the
// round resolves, same upsert shape as submit-vote/submit-door-pick.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const ctx = await authenticate(req);
    requireRole(ctx, "player");
    requireAlive(ctx);

    const body = await readJsonBody<Record<string, unknown>>(req);
    const option = requireOneOf(body, "option", PROLOGUE_OPTIONS);

    const db = sql();

    const rounds = await db<Round[]>`
      select * from battle_royale.rounds
      where game_id = ${ctx.game.id} and resolved_at is null
      order by round_number desc
      limit 1
    `;
    const round = rounds[0];
    if (!round) {
      throw new HttpError(409, "no_open_round", "There is no open round to decide in right now.");
    }
    if (!round.is_prologue) {
      throw new HttpError(409, "not_prologue_round", "This round isn't the opening group decision.");
    }

    await db`
      insert into battle_royale.prologue_votes (round_id, voter_player_id, option)
      values (${round.id}, ${ctx.player.id}, ${option})
      on conflict (round_id, voter_player_id) do update set option = excluded.option, cast_at = now()
    `;

    return jsonResponse({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
});
