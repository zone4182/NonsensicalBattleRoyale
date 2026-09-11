import { errorResponse, HttpError, jsonResponse, preflightResponse, readJsonBody } from "../_shared/http.ts";
import { authenticate, requireAlive, requireRole } from "../_shared/auth.ts";
import { sql } from "../_shared/db.ts";
import { requireString } from "../_shared/validation.ts";
import { isValidRoomId, validDestinations, type RoomId } from "../_shared/mansion.ts";
import type { Round } from "../_shared/types.ts";

// Move-to-Room mini-game. Re-submittable right up until the round resolves -- same
// "select then confirm, changeable until it's locked in by resolution" shape as a
// normal vote, via upsert on (round_id, player_id).
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
    const targetRoomId = requireString(body, "target_room_id");
    if (!isValidRoomId(targetRoomId)) {
      throw new HttpError(400, "invalid_field", "'target_room_id' is not a real room.");
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
      throw new HttpError(409, "no_open_round", "There is no open round to move in right now.");
    }

    const [currentRoom] = await db<{ current_room_id: RoomId }[]>`
      select current_room_id from battle_royale.player_rooms
      where game_id = ${ctx.game.id} and player_id = ${ctx.player.id}
    `;
    if (!currentRoom) {
      throw new HttpError(409, "no_room_assigned", "You don't have a room assigned yet.");
    }

    const legalDestinations = validDestinations(currentRoom.current_room_id);
    if (!legalDestinations.includes(targetRoomId)) {
      throw new HttpError(
        400,
        "invalid_destination",
        "That room isn't adjacent to your current room (or a connected staircase cell).",
      );
    }

    await db`
      insert into battle_royale.round_room_moves (round_id, player_id, target_room_id)
      values (${round.id}, ${ctx.player.id}, ${targetRoomId})
      on conflict (round_id, player_id) do update set target_room_id = excluded.target_room_id, submitted_at = now()
    `;

    return jsonResponse({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
});
