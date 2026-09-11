import { errorResponse, HttpError, jsonResponse, preflightResponse, readJsonBody } from "../_shared/http.ts";
import { authenticate, requireAlive, requireRole } from "../_shared/auth.ts";
import { castVote, revokeAllActiveVotesForVoter, sql } from "../_shared/db.ts";
import { requireUuid, optionalStringMaxLength } from "../_shared/validation.ts";
import type { Player, Round } from "../_shared/types.ts";

// Only for this round's double-vote holder (round.double_vote_player_id === caller).
// Everyone else keeps using submit-vote, one call per cast, unchanged.
//
// Replaces the voter's entire current choice set atomically instead of layering
// submit-vote's single-vote "make room by revoking the oldest" logic on top of a
// two-slot UI -- that logic only kicks in once the voter is AT capacity, so editing an
// already-cast slot while the other slot is still empty would otherwise just add a
// second vote instead of replacing the first. The two-slot screen always sends the
// full current state of both slots (whichever are non-empty), so "revoke everything,
// then insert exactly what was sent" is always the correct outcome, whether that's a
// fresh double cast, filling in the second slot later, or changing either slot's pick.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const ctx = await authenticate(req);
    requireRole(ctx, "player");
    requireAlive(ctx);

    const body = await readJsonBody<Record<string, unknown>>(req);
    const rawVotes = body.votes;
    if (!Array.isArray(rawVotes) || rawVotes.length === 0 || rawVotes.length > 2) {
      throw new HttpError(400, "invalid_field", "'votes' must be an array of 1 or 2 entries.");
    }
    const votes = rawVotes.map((entry) => {
      if (typeof entry !== "object" || entry === null) {
        throw new HttpError(400, "invalid_field", "Each entry in 'votes' must be an object.");
      }
      const record = entry as Record<string, unknown>;
      return {
        targetPlayerId: requireUuid(record, "target_player_id"),
        reason: optionalStringMaxLength(record, "reason", 100),
      };
    });

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

    if (round.double_vote_player_id !== ctx.player.id) {
      throw new HttpError(403, "not_double_vote_holder", "You don't hold the double vote this round.");
    }

    if (
      ctx.player.vote_suspended_through_round_number !== null &&
      round.round_number <= ctx.player.vote_suspended_through_round_number
    ) {
      throw new HttpError(403, "vote_suspended", "You missed the last deadline and are sitting out this round.");
    }

    if (ctx.player.vote_locked_for_round_number === round.round_number) {
      throw new HttpError(409, "vote_locked", "You've locked in your vote for this round -- it can no longer be changed.");
    }

    const targetIds = [...new Set(votes.map((v) => v.targetPlayerId))];
    const targets = await db<Player[]>`
      select * from battle_royale.players where id in ${db(targetIds)} and game_id = ${ctx.game.id}
    `;
    const targetById = new Map(targets.map((p) => [p.id, p]));
    for (const vote of votes) {
      const target = targetById.get(vote.targetPlayerId);
      if (!target) {
        throw new HttpError(400, "invalid_target", "Target player does not exist in this game.");
      }
      if (target.role !== "player") {
        throw new HttpError(400, "invalid_target", "The Game Master is not a votable player.");
      }
      if (target.status !== "alive") {
        throw new HttpError(400, "invalid_target", "Target player is not alive.");
      }
    }

    await db.begin(async (tx) => {
      await revokeAllActiveVotesForVoter(tx, round.id, ctx.player.id);
      for (const [index, vote] of votes.entries()) {
        await castVote(tx, {
          roundId: round.id,
          voterPlayerId: ctx.player.id,
          targetPlayerId: vote.targetPlayerId,
          isDoubleVote: index === 1,
          reason: vote.reason ?? null,
        });
      }
    });

    return jsonResponse({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
});
