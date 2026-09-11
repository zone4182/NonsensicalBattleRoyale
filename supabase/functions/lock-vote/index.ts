import { errorResponse, HttpError, jsonResponse, preflightResponse } from "../_shared/http.ts";
import { authenticate, requireAlive, requireRole } from "../_shared/auth.ts";
import { countActiveVotesForVoter, sql } from "../_shared/db.ts";
import type { Round } from "../_shared/types.ts";

// Lets a player make their own already-cast vote definitive early, even when
// games.allow_vote_change is on -- see submit-vote/index.ts's matching check. This is
// a per-player, per-round opt-out of that flexibility, not something that touches the
// game-wide setting itself. Idempotent: locking an already-locked round is a no-op,
// not an error -- the button calling this doesn't need to track whether it already
// succeeded once.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const ctx = await authenticate(req);
    requireRole(ctx, "player");
    requireAlive(ctx);

    const db = sql();

    const rounds = await db<Round[]>`
      select * from battle_royale.rounds
      where game_id = ${ctx.game.id} and resolved_at is null
      order by round_number desc
      limit 1
    `;
    const round = rounds[0];
    if (!round) {
      throw new HttpError(409, "no_open_round", "There is no open round to lock a vote in right now.");
    }

    if (ctx.player.vote_locked_for_round_number !== round.round_number) {
      const castCount = await countActiveVotesForVoter(round.id, ctx.player.id);
      if (castCount === 0) {
        throw new HttpError(409, "no_vote_cast", "Cast a vote before locking it in.");
      }

      await db`
        update battle_royale.players set vote_locked_for_round_number = ${round.round_number} where id = ${ctx.player.id}
      `;
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
});
