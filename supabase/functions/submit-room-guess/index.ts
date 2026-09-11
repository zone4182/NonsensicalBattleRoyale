import { errorResponse, HttpError, jsonResponse, preflightResponse, readJsonBody } from "../_shared/http.ts";
import { authenticate, requireAlive, requireRole } from "../_shared/auth.ts";
import { sql } from "../_shared/db.ts";
import { requireString } from "../_shared/validation.ts";
import { isValidRoomId } from "../_shared/mansion.ts";
import type { Round } from "../_shared/types.ts";

// Move-to-Room mini-game. Deliberately decoupled from submit-room-move -- a player can
// guess without moving, move without guessing, both, or neither (see the mini-game
// doc's "Guessing mechanic"). Re-submittable until the round resolves, same upsert
// shape as submit-room-move.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const ctx = await authenticate(req);
    requireRole(ctx, "player");
    requireAlive(ctx);

    if (!ctx.game.move_to_room_enabled) {
      throw new HttpError(409, "mini_game_disabled", "This game doesn't have the Move-to-Room mini-game enabled.");
    }

    const body = await readJsonBody<Record<string, unknown>>(req);
    const guessedRoomId = requireString(body, "guessed_room_id");
    if (!isValidRoomId(guessedRoomId)) {
      throw new HttpError(400, "invalid_field", "'guessed_room_id' is not a real room.");
    }

    const db = sql();

    const rounds = await db<Round[]>`
      select * from battle_royale.rounds
      where game_id = ${ctx.game.id} and resolved_at is null
      order by round_number desc
      limit 1
    `;
    const round = rounds[0];
    if (!round) {
      throw new HttpError(409, "no_open_round", "There is no open round to guess in right now.");
    }

    const [assignment] = await db<{ target_player_id: string }[]>`
      select target_player_id from battle_royale.round_guess_assignments
      where round_id = ${round.id} and guesser_player_id = ${ctx.player.id}
    `;
    if (!assignment) {
      throw new HttpError(409, "no_guess_assigned", "You don't have anyone to guess about this round.");
    }

    await db`
      insert into battle_royale.round_room_guesses (round_id, guesser_player_id, guessed_room_id)
      values (${round.id}, ${ctx.player.id}, ${guessedRoomId})
      on conflict (round_id, guesser_player_id) do update set guessed_room_id = excluded.guessed_room_id, submitted_at = now()
    `;

    return jsonResponse({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
});
