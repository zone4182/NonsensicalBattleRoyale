import { errorResponse, HttpError, jsonResponse, preflightResponse } from "../_shared/http.ts";
import { authenticate } from "../_shared/auth.ts";
import { revealVotesForGame, sql, type VoteAttribution } from "../_shared/db.ts";
import { publicName } from "../_shared/names.ts";
import type { Round } from "../_shared/types.ts";

// The "Show game stats" screen -- full round-by-round vote breakdown (including
// reasons) and Three Doors picks, revealed to EVERY player once the game has ended.
// Sanctioned per revealVotesForGame's own comment in db.ts: "the end-of-game reveal
// path, once game.phase === 'ended' -- for every player." Real names throughout
// (publicName, same as the roster/narration -- votes staying anonymous was only ever a
// promise for the DURATION of the game, not forever).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const ctx = await authenticate(req);

    if (ctx.game.phase !== "ended") {
      throw new HttpError(409, "game_not_ended", "Game stats aren't available until the game has ended.");
    }

    const db = sql();

    const players = await db<{ id: string; display_name: string; chosen_display_name: string | null }[]>`
      select id, display_name, chosen_display_name from battle_royale.players where game_id = ${ctx.game.id}
    `;
    const nameById = new Map(players.map((p) => [p.id, publicName(p.display_name, p.chosen_display_name)]));

    const rounds = await db<Round[]>`
      select id, round_number, eliminated_player_id, tie_break_method, resolved_at
      from battle_royale.rounds
      where game_id = ${ctx.game.id} and resolved_at is not null
      order by round_number asc
    `;

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
      rounds: rounds.map((r) => {
        const roundVotes = votesByRoundId.get(r.id) ?? [];
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
            voter_display_name: publicName(v.voter_display_name, v.voter_chosen_display_name),
            target_display_name: publicName(v.target_display_name, v.target_chosen_display_name),
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
