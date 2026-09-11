// Move-to-Room mini-game -- everything that isn't bot-specific (see bots.ts for
// castBotRoomMoves/castBotRoomGuesses) or pure floor-plan data (see mansion.ts).
import { sql } from "./db.ts";
import { STARTING_ROOM, type RoomId } from "./mansion.ts";

type Exec = ReturnType<typeof sql>;

// Called once, right when a player's row is created (redeem-invite, or bot creation --
// see bots.ts), only when the game has the mini-game enabled.
export async function initPlayerRoom(exec: Exec, gameId: string, playerId: string): Promise<void> {
  await exec`
    insert into battle_royale.player_rooms (game_id, player_id, current_room_id)
    values (${gameId}, ${playerId}, ${STARTING_ROOM})
  `;
}

// Called once per round creation (same moment as the double-vote holder pick) -- every
// alive player gets a fresh, uniform-random guess target excluding themselves. No
// memory of past rounds' targets, same simplicity convention as the double-vote pick.
// See the mini-game doc's "Guessing mechanic": decoupled from moving, one per player
// per round, targets exclude the GM and any ghost by construction (only alive
// role='player' rows are ever candidates).
export async function assignRoundGuessTargets(exec: Exec, gameId: string, roundId: string): Promise<void> {
  const alivePlayers = await exec<{ id: string }[]>`
    select id from battle_royale.players where game_id = ${gameId} and status = 'alive' and role = 'player'
  `;
  if (alivePlayers.length < 2) return;

  for (const player of alivePlayers) {
    const candidates = alivePlayers.filter((p) => p.id !== player.id);
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    await exec`
      insert into battle_royale.round_guess_assignments (round_id, guesser_player_id, target_player_id)
      values (${roundId}, ${player.id}, ${target.id})
    `;
  }
}

// Called from resolve-round as part of resolving a round -- this mini-game is tied to
// the round clock (unlike Russian Roulette's independent GM-triggered sessions), so it
// resolves at the exact same moment votes do. Applies every pending move first, then
// resolves every pending guess against each target's now-updated room -- a guess is
// evaluated against where the target actually ends up, whether they moved or not, and
// still evaluates normally even if the target happens to also be eliminated by this
// same round's vote (their room for this round is still a real, checkable fact).
export async function resolveRoomMovesAndGuesses(exec: Exec, gameId: string, roundId: string): Promise<void> {
  const moves = await exec<{ player_id: string; target_room_id: RoomId }[]>`
    select player_id, target_room_id from battle_royale.round_room_moves where round_id = ${roundId}
  `;
  for (const move of moves) {
    await exec`
      update battle_royale.player_rooms
      set current_room_id = ${move.target_room_id}, updated_at = now()
      where game_id = ${gameId} and player_id = ${move.player_id}
    `;
  }

  const guesses = await exec<{ guesser_player_id: string; guessed_room_id: RoomId }[]>`
    select guesser_player_id, guessed_room_id from battle_royale.round_room_guesses where round_id = ${roundId}
  `;
  if (guesses.length === 0) return;

  const assignments = await exec<{ guesser_player_id: string; target_player_id: string }[]>`
    select guesser_player_id, target_player_id from battle_royale.round_guess_assignments where round_id = ${roundId}
  `;
  const targetByGuesser = new Map(assignments.map((a) => [a.guesser_player_id, a.target_player_id]));

  const currentRooms = await exec<{ player_id: string; current_room_id: RoomId }[]>`
    select player_id, current_room_id from battle_royale.player_rooms where game_id = ${gameId}
  `;
  const roomByPlayer = new Map(currentRooms.map((r) => [r.player_id, r.current_room_id]));

  for (const guess of guesses) {
    const targetPlayerId = targetByGuesser.get(guess.guesser_player_id);
    if (!targetPlayerId) continue;
    const actualRoom = roomByPlayer.get(targetPlayerId);
    const correct = actualRoom === guess.guessed_room_id;

    await exec`
      update battle_royale.round_room_guesses set correct = ${correct}
      where round_id = ${roundId} and guesser_player_id = ${guess.guesser_player_id}
    `;
    if (correct) {
      await exec`
        update battle_royale.players set room_guess_points = room_guess_points + 1 where id = ${guess.guesser_player_id}
      `;
    }
  }
}
