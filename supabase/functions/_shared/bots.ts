// Bot Mode (concept/bot-mode/BOT-MODE.md) -- GM-facing testing tool, not a player-facing
// mechanic. Bots act through the exact same tables/helpers real players do (castVote,
// door_picks) so behavior can't drift from the real rules; the only bot-specific logic
// is *when* they act (instantly, server-side, in the same transaction that opens a round
// or enters Three Doors) and *how* they choose (uniform random -- see BOT-MODE.md "Open
// questions" #5 for what's deliberately out of scope: powers, Seance).
import { castVote, sql } from "./db.ts";
import { generateInviteToken } from "./tokens.ts";

type Exec = ReturnType<typeof sql>;

// Bots are `role = 'player'` rows with `is_bot = true`, each backed by a synthetic,
// already-redeemed invite (players.invite_id is a required FK -- see the migration).
// Called once, inside create-game's transaction, right after the real game row exists.
export async function createBotPlayers(exec: Exec, gameId: string, botCount: number): Promise<void> {
  for (let i = 1; i <= botCount; i++) {
    const displayName = `Bot ${i}`;
    const [invite] = await exec`
      insert into battle_royale.invites (game_id, token, display_name, role, redeemed_at)
      values (${gameId}, ${generateInviteToken()}, ${displayName}, 'player', now())
      returning id
    `;
    await exec`
      insert into battle_royale.players (game_id, invite_id, role, display_name, is_bot)
      values (${gameId}, ${invite.id}, 'player', ${displayName}, true)
    `;
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
      await castVote({
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
