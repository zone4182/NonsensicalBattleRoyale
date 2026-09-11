import { errorResponse, HttpError, jsonResponse, preflightResponse, readJsonBody } from "../_shared/http.ts";
import { authenticate, requireAlive, requireRole } from "../_shared/auth.ts";
import { castVote, countActiveVotesForVoter, revokeOldestActiveVotesForVoter, sql } from "../_shared/db.ts";
import { optionalStringMaxLength, requireUuid } from "../_shared/validation.ts";
import type { Player, Round } from "../_shared/types.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const ctx = await authenticate(req);
    requireRole(ctx, "player");
    requireAlive(ctx);

    const body = await readJsonBody<Record<string, unknown>>(req);
    const targetPlayerId = requireUuid(body, "target_player_id");
    const reason = optionalStringMaxLength(body, "reason", 100);

    const db = sql();

    const rounds = await db<Round[]>`
      select * from battle_royale.rounds
      where game_id = ${ctx.game.id} and resolved_at is null
      order by round_number desc
      limit 1
    `;
    const round = rounds[0];
    if (!round) {
      throw new HttpError(409, "no_open_round", "There is no open round to vote in right now.");
    }

    if (
      ctx.player.vote_suspended_through_round_number !== null &&
      round.round_number <= ctx.player.vote_suspended_through_round_number
    ) {
      throw new HttpError(403, "vote_suspended", "You missed the last deadline and are sitting out this round.");
    }

    // A player can lock their own vote in early (lock-vote/index.ts), regardless of
    // games.allow_vote_change -- an explicit per-round opt-out of that flexibility,
    // not something the game-wide setting can override.
    if (ctx.player.vote_locked_for_round_number === round.round_number) {
      throw new HttpError(409, "vote_locked", "You've locked in your vote for this round -- it can no longer be changed.");
    }

    const targets = await db<Player[]>`
      select * from battle_royale.players where id = ${targetPlayerId} and game_id = ${ctx.game.id}
    `;
    const target = targets[0];
    if (!target) {
      throw new HttpError(400, "invalid_target", "Target player does not exist in this game.");
    }
    if (target.role !== "player") {
      throw new HttpError(400, "invalid_target", "The Game Master is not a votable player.");
    }
    if (target.status !== "alive") {
      throw new HttpError(400, "invalid_target", "Target player is not alive.");
    }

    const isDoubleVoteHolder = round.double_vote_player_id === ctx.player.id;
    const entitlement = isDoubleVoteHolder ? 2 : 1;
    let alreadyCast = await countActiveVotesForVoter(round.id, ctx.player.id);
    if (alreadyCast >= entitlement) {
      if (!ctx.game.allow_vote_change) {
        throw new HttpError(409, "vote_entitlement_exhausted", "You have already cast all votes you're entitled to this round.");
      }
      // Vote change is on: make room by revoking the voter's own oldest cast(s) rather
      // than rejecting -- a vote is only final once the deadline (or an early GM
      // resolve) actually locks the round.
      await revokeOldestActiveVotesForVoter(db, round.id, ctx.player.id, alreadyCast - entitlement + 1);
      alreadyCast = await countActiveVotesForVoter(round.id, ctx.player.id);
    }

    await castVote(db, {
      roundId: round.id,
      voterPlayerId: ctx.player.id,
      targetPlayerId: target.id,
      isDoubleVote: isDoubleVoteHolder && alreadyCast === 1,
      reason: reason ?? null,
    });

    // Never echo vote contents back, even to the voter themself.
    return jsonResponse({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
});
