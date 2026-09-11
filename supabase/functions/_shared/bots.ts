// Bot Mode (concept/bot-mode/BOT-MODE.md) -- GM-facing testing tool, not a player-facing
// mechanic. Bots act through the exact same tables/helpers real players do (castVote,
// door_picks) so behavior can't drift from the real rules; the only bot-specific logic
// is *when* they act (instantly, server-side, in the same transaction that opens a round
// or enters Three Doors) and *how* they choose (uniform random -- see BOT-MODE.md "Open
// questions" #5 for what's deliberately out of scope: powers, Seance).
import { castVote, sql } from "./db.ts";
import { generateInviteToken } from "./tokens.ts";
import { ALL_ROOM_IDS, STARTING_ROOM, validDestinations, type RoomId } from "./mansion.ts";

type Exec = ReturnType<typeof sql>;

// Flavor only -- these are just display_name strings, same column a real invite would
// use, so nothing else needs to know or care that a bot is named "Count Snackula"
// instead of "Bot 3". Comfortably more than the 19-bot ceiling (see validation.ts'
// bot_count range) so a single game never needs to repeat one.
const BOT_NAMES = [
  "Count Snackula",
  "Sir Reginald Pancake III",
  "Baroness Von Suspicion",
  "Mothman's Accountant",
  "The Candlestick Whisperer",
  "Duchess Alibi",
  "Professor Wobblebottom",
  "Reverend Doubt",
  "Lady Trapdoor",
  "Constable Red Herring",
  "The Butler Did It (Probably)",
  "Madame Sixth Sense",
  "Lord Ominous",
  "Great Aunt Cyanide",
  "Inspector Gadabout",
  "The Understudy Ghost",
  "Colonel Mustache",
  "Widow Creakyfloor",
  "The Substitute Vampire",
  "Baron Von Sneeze",
  "Mx. Cryptic",
  "The Nervous Taxidermist",
  "Countess Eavesdrop",
  "Sir Loin of Beef",
  "The Understaffed Ghost",
  "Deacon Suspicious",
  "Auntie Poison Ivy",
  "The Gardener Who Knows Too Much",
  "Viscount Alibi-Adjacent",
  "The Overqualified Maid",
] as const;

function pickBotNames(count: number): string[] {
  const shuffled = [...BOT_NAMES].sort(() => Math.random() - 0.5);
  const names: string[] = shuffled.slice(0, count);
  // Defensive only -- botCount is capped at 19 (well under BOT_NAMES.length) by
  // validation.ts, so this never actually triggers.
  for (let i = names.length; i < count; i++) names.push(`Bot ${i + 1}`);
  return names;
}

// Bots are `role = 'player'` rows with `is_bot = true`, each backed by a synthetic,
// already-redeemed invite (players.invite_id is a required FK -- see the migration).
// Called once, inside create-game's transaction, right after the real game row exists.
export async function createBotPlayers(exec: Exec, gameId: string, botCount: number, moveToRoomEnabled: boolean): Promise<void> {
  const botNames = pickBotNames(botCount);
  for (let i = 1; i <= botCount; i++) {
    const displayName = botNames[i - 1];
    const [invite] = await exec`
      insert into battle_royale.invites (game_id, token, display_name, role, redeemed_at)
      values (${gameId}, ${generateInviteToken()}, ${displayName}, 'player', now())
      returning id
    `;
    const [player] = await exec`
      insert into battle_royale.players (game_id, invite_id, role, display_name, is_bot)
      values (${gameId}, ${invite.id}, 'player', ${displayName}, true)
      returning id
    `;
    if (moveToRoomEnabled) {
      await exec`
        insert into battle_royale.player_rooms (game_id, player_id, current_room_id)
        values (${gameId}, ${player.id}, ${STARTING_ROOM})
      `;
    }
  }
}

// Called once, right after a round (1 or N+1) is inserted, in the same transaction --
// every living bot immediately casts its full vote entitlement (2 if it holds the
// round's double vote, else 1), each at a uniform-random living target excluding itself.
export async function castBotVotes(
  exec: Exec,
  gameId: string,
  roundId: string,
  doubleVotePlayerId: string | null,
): Promise<void> {
  const alivePlayers = await exec<{ id: string; is_bot: boolean }[]>`
    select id, is_bot from battle_royale.players
    where game_id = ${gameId} and status = 'alive' and role = 'player'
  `;
  const bots = alivePlayers.filter((p) => p.is_bot);
  if (bots.length === 0) return;

  for (const bot of bots) {
    const candidates = alivePlayers.filter((p) => p.id !== bot.id);
    if (candidates.length === 0) continue;

    const entitlement = bot.id === doubleVotePlayerId ? 2 : 1;
    for (let castIndex = 0; castIndex < entitlement; castIndex++) {
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      await castVote(exec, {
        roundId,
        voterPlayerId: bot.id,
        targetPlayerId: target.id,
        isDoubleVote: castIndex === 1,
      });
    }
  }
}

// Called once, right when a game enters the 'three_doors' phase, for whichever of the
// exactly-3 remaining players are bots -- otherwise a bot reaching the final 3 would
// deadlock the game waiting for a door pick that never comes (BOT-MODE.md #5).
export async function castBotDoorPicks(exec: Exec, gameId: string, aliveBotPlayerIds: string[]): Promise<void> {
  for (const playerId of aliveBotPlayerIds) {
    const doorNumber = 1 + Math.floor(Math.random() * 3);
    await exec`
      insert into battle_royale.door_picks (game_id, player_id, door_number)
      values (${gameId}, ${playerId}, ${doorNumber})
    `;
  }
}

// Move-to-Room mini-game. Called once, right after a round is inserted (same moment as
// castBotVotes), only when the game has the mini-game enabled -- every living bot picks
// a uniform-random legal destination from wherever it currently is (adjacent room, its
// own room again as an explicit "stay", or a staircase cell's cross-floor option).
export async function castBotRoomMoves(exec: Exec, gameId: string, roundId: string): Promise<void> {
  const bots = await exec<{ id: string }[]>`
    select id from battle_royale.players where game_id = ${gameId} and status = 'alive' and role = 'player' and is_bot = true
  `;
  if (bots.length === 0) return;

  const rooms = await exec<{ player_id: string; current_room_id: RoomId }[]>`
    select player_id, current_room_id from battle_royale.player_rooms
    where game_id = ${gameId} and player_id in ${exec(bots.map((b) => b.id))}
  `;

  for (const room of rooms) {
    const options = validDestinations(room.current_room_id);
    const target = options[Math.floor(Math.random() * options.length)];
    await exec`
      insert into battle_royale.round_room_moves (round_id, player_id, target_room_id)
      values (${roundId}, ${room.player_id}, ${target})
    `;
  }
}

// Move-to-Room mini-game. Called once, after assignRoundGuessTargets has run for this
// round (roomMovement.ts) -- every living bot with a guess assignment submits a
// uniform-random real room, same "no strategy, just uniform random" convention as
// every other bot decision in this file.
export async function castBotRoomGuesses(exec: Exec, gameId: string, roundId: string): Promise<void> {
  const bots = await exec<{ id: string }[]>`
    select id from battle_royale.players where game_id = ${gameId} and status = 'alive' and role = 'player' and is_bot = true
  `;
  if (bots.length === 0) return;

  const assignments = await exec<{ guesser_player_id: string }[]>`
    select guesser_player_id from battle_royale.round_guess_assignments
    where round_id = ${roundId} and guesser_player_id in ${exec(bots.map((b) => b.id))}
  `;

  for (const assignment of assignments) {
    const guess = ALL_ROOM_IDS[Math.floor(Math.random() * ALL_ROOM_IDS.length)];
    await exec`
      insert into battle_royale.round_room_guesses (round_id, guesser_player_id, guessed_room_id)
      values (${roundId}, ${assignment.guesser_player_id}, ${guess})
    `;
  }
}
