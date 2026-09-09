import { errorResponse, jsonResponse, preflightResponse } from "../_shared/http.ts";
import { authenticate, requireRole } from "../_shared/auth.ts";
import { revealVotesForGame, sql, type VoteAttribution } from "../_shared/db.ts";
import type { Round } from "../_shared/types.ts";

// GM-only. Three things live here that never appear anywhere else:
//   1. The game's own settings (round timing, missed-deadline/round1-start/resolution
//      modes, vote-change) -- ctx.game already has the full row, no extra query needed.
//   2. Full vote attribution (who voted for whom) per resolved round -- see
//      revealVotesForGame's own comment in db.ts for why this is sanctioned for the GM
//      specifically, live, unlike the player-facing end-of-game-only reveal.
//   3. Three Doors picks, live -- door_picks was never anonymity-gated the way votes
//      is (no "only the reveal function" rule for this table), so this is a plain read.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const ctx = await authenticate(req);
    requireRole(ctx, "gm");

    const db = sql();

    const rounds = await db<Round[]>`
      select id, round_number, eliminated_player_id, tie_break_method, voting_deadline_at, resolved_at
      from battle_royale.rounds
      where game_id = ${ctx.game.id} and resolved_at is not null
      order by round_number asc
    `;

    const players = await db<{ id: string; display_name: string }[]>`
      select id, display_name from battle_royale.players where game_id = ${ctx.game.id}
    `;
    const nameById = new Map(players.map((p) => [p.id, p.display_name]));

    const votes = await revealVotesForGame(ctx.game.id);
    const votesByRoundId = new Map<string, VoteAttribution[]>();
    for (const vote of votes) {
      const list = votesByRoundId.get(vote.round_id) ?? [];
      list.push(vote);
      votesByRoundId.set(vote.round_id, list);
    }

    const doorPicks = await db<{ player_id: string; door_number: number; resolved_outcome: string | null; picked_at: string }[]>`
      select player_id, door_number, resolved_outcome, picked_at
      from battle_royale.door_picks
      where game_id = ${ctx.game.id}
      order by picked_at asc
    `;

    return jsonResponse({
      game: {
        round_interval_minutes: ctx.game.round_interval_minutes,
        missed_deadline_mode: ctx.game.missed_deadline_mode,
        round1_start_mode: ctx.game.round1_start_mode,
        round_resolution_mode: ctx.game.round_resolution_mode,
        allow_vote_change: ctx.game.allow_vote_change,
        double_vote_enabled: ctx.game.double_vote_enabled,
        double_vote_floor_rounds: ctx.game.double_vote_floor_rounds,
        survival_streak_threshold: ctx.game.survival_streak_threshold,
        created_at: ctx.game.created_at,
        finished_at: ctx.game.finished_at,
      },
      rounds: rounds.map((r) => {
        const roundVotes = votesByRoundId.get(r.id) ?? [];
        // Per-target tally within this round -- redundant across rows sharing a
        // target, but that's exactly what "add a column" to this flat table means.
        const countByTarget = new Map<string, number>();
        for (const v of roundVotes) {
          countByTarget.set(v.target_player_id, (countByTarget.get(v.target_player_id) ?? 0) + 1);
        }

        return {
          round_number: r.round_number,
          eliminated_player_display_name: r.eliminated_player_id ? (nameById.get(r.eliminated_player_id) ?? null) : null,
          tie_break_method: r.tie_break_method,
          resolved_at: r.resolved_at,
          votes: roundVotes.map((v) => ({
            voter_display_name: v.voter_display_name,
            target_display_name: v.target_display_name,
            target_vote_count: countByTarget.get(v.target_player_id) ?? 0,
            is_double_vote: v.is_double_vote,
            reason: v.reason,
            cast_at: v.cast_at,
          })),
        };
      }),
      door_picks: doorPicks.map((p) => ({
        player_display_name: nameById.get(p.player_id) ?? "unknown",
        door_number: p.door_number,
        resolved_outcome: p.resolved_outcome,
        picked_at: p.picked_at,
      })),
    });
  } catch (err) {
    return errorResponse(err);
  }
});
