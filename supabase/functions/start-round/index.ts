import { errorResponse, HttpError, jsonResponse, preflightResponse } from "../_shared/http.ts";
import { authenticate, requireRole } from "../_shared/auth.ts";
import { pickDoubleVoteHolder, sql } from "../_shared/db.ts";
import { grantRandomDrop } from "../_shared/powers.ts";
import { castBotRoomGuesses, castBotRoomMoves, castBotVotes } from "../_shared/bots.ts";
import { sendPushToPlayers } from "../_shared/push.ts";
import { MIN_PLAYERS_TO_START } from "../_shared/constants.ts";
import { assignRoundGuessTargets } from "../_shared/roomMovement.ts";
import type { Game } from "../_shared/types.ts";

// GM-only. Creates round 1 for a game still in setup -- used for gm_manual (GM clicks
// whenever ready) and as the local-dev manual fallback for scheduled games (real
// scheduled auto-start needs cloud cron, out of scope this milestone). Always round 1
// only -- round N+1 is exclusively resolve-round's job.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const ctx = await authenticate(req);
    requireRole(ctx, "gm");

    const db = sql();
    const result = await db.begin(async (tx) => {
      const [game] = await tx<Game[]>`select * from battle_royale.games where id = ${ctx.game.id} for update`;
      if (game.phase !== "setup") {
        throw new HttpError(409, "not_in_setup", "Round 1 can only be started while the game is in setup.");
      }

      const existing = await tx`select id from battle_royale.rounds where game_id = ${game.id} limit 1`;
      if (existing.length > 0) {
        throw new HttpError(409, "round_already_exists", "Round 1 has already been started for this game.");
      }

      const [{ player_count }] = await tx<{ player_count: number }[]>`
        select count(*)::int as player_count from battle_royale.players
        where game_id = ${game.id} and role = 'player'
      `;
      if (player_count < MIN_PLAYERS_TO_START) {
        throw new HttpError(
          409,
          "not_enough_players",
          `At least ${MIN_PLAYERS_TO_START} players must have accepted their invite before round 1 can start (currently ${player_count}).`,
        );
      }

      const doubleVotePlayerId = game.double_vote_enabled
        ? await pickDoubleVoteHolder(tx, game.id, game.double_vote_floor_rounds)
        : null;

      const [round] = await tx`
        insert into battle_royale.rounds (game_id, round_number, opens_at, voting_deadline_at, double_vote_player_id)
        values (
          ${game.id},
          1,
          now(),
          now() + (${game.round_interval_minutes} || ' minutes')::interval,
          ${doubleVotePlayerId}
        )
        returning id, round_number, voting_deadline_at
      `;
      await tx`update battle_royale.games set phase = 'active' where id = ${game.id}`;

      const aliveRoster = await tx<{ id: string }[]>`
        select id from battle_royale.players where game_id = ${game.id} and status = 'alive' and role = 'player'
      `;
      await grantRandomDrop(
        tx,
        game.id,
        round.id,
        aliveRoster.map((p) => p.id),
      );
      await castBotVotes(tx, game.id, round.id, doubleVotePlayerId);
      if (game.move_to_room_enabled) {
        await assignRoundGuessTargets(tx, game.id, round.id);
        await castBotRoomMoves(tx, game.id, round.id);
        await castBotRoomGuesses(tx, game.id, round.id);
      }

      return {
        roundId: round.id,
        roundNumber: round.round_number,
        votingDeadlineAt: round.voting_deadline_at,
        playerIds: aliveRoster.map((p) => p.id),
      };
    });

    // Outside the transaction -- a push failure must never roll back the round that
    // already started. See push.ts's own comment for the same reasoning.
    await sendPushToPlayers(result.playerIds, {
      title: `Round ${result.roundNumber} has started`,
      body: "Voting is open -- head to the app to cast your vote.",
      url: "/game",
    });

    return jsonResponse(
      { round_id: result.roundId, round_number: result.roundNumber, voting_deadline_at: result.votingDeadlineAt },
      201,
    );
  } catch (err) {
    return errorResponse(err);
  }
});
