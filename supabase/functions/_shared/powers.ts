import { sql, tallyVotesForRound, getRecentResolvedRounds } from "./db.ts";
import type { Game, Round } from "./types.ts";

type Exec = ReturnType<typeof sql>;

export async function getEnabledPowerKeys(exec: Exec, gameId: string): Promise<string[]> {
  const rows = await exec<{ power_key: string }[]>`
    select power_key from battle_royale.game_power_settings where game_id = ${gameId} and enabled = true
  `;
  return rows.map((r) => r.power_key);
}

export async function pickRandomEligiblePower(exec: Exec, gameId: string, playerId: string): Promise<string | null> {
  const enabled = await getEnabledPowerKeys(exec, gameId);
  if (enabled.length === 0) return null;

  const held = await exec<{ power_key: string }[]>`
    select power_key from battle_royale.power_grants
    where granted_to_player_id = ${playerId} and used_at is null
  `;
  const heldKeys = new Set(held.map((h) => h.power_key));
  const eligible = enabled.filter((k) => !heldKeys.has(k));
  if (eligible.length === 0) return null;

  return eligible[Math.floor(Math.random() * eligible.length)];
}

export async function grantPower(
  exec: Exec,
  params: {
    gameId: string;
    roundId: string | null;
    powerKey: string;
    playerId: string;
    method: "random" | "earned" | "gm_grant";
    gmActionId?: string;
    effectDetail?: Record<string, unknown>;
  },
): Promise<void> {
  await exec`
    insert into battle_royale.power_grants
      (game_id, round_id, power_key, granted_to_player_id, acquisition_method, granted_by_gm_action_id, effect_detail)
    values (
      ${params.gameId},
      ${params.roundId},
      ${params.powerKey},
      ${params.playerId},
      ${params.method},
      ${params.gmActionId ?? null},
      ${exec.json(params.effectDetail ?? {})}
    )
  `;
}

// The full "random drop" algorithm: one random alive player from the pool, one random
// eligible power for them, one grant per round. No-op (not an error) if the pool or
// eligible-power set is empty. Deliberately simple -- exact tuning is not a hard
// game-design requirement (game-design v0.9 §8.2).
export async function grantRandomDrop(
  exec: Exec,
  gameId: string,
  roundId: string,
  eligiblePlayerIds: string[],
): Promise<void> {
  if (eligiblePlayerIds.length === 0) return;
  const playerId = eligiblePlayerIds[Math.floor(Math.random() * eligiblePlayerIds.length)];
  const powerKey = await pickRandomEligiblePower(exec, gameId, playerId);
  if (!powerKey) return;
  await grantPower(exec, { gameId, roundId, powerKey, playerId, method: "random" });
}

function topTwoDistinctVoteCounts(tally: { targetPlayerId: string; voteCount: number }[]): number[] {
  const distinct = [...new Set(tally.map((t) => t.voteCount))].sort((a, b) => b - a);
  return distinct.slice(0, 2);
}

async function alreadyGrantedForTrigger(
  exec: Exec,
  playerId: string,
  triggerKey: string,
  sinceRoundNumber: number,
  gameId: string,
): Promise<boolean> {
  const rows = await exec<{ id: string }[]>`
    select pg.id from battle_royale.power_grants pg
    join battle_royale.rounds r on r.id = pg.round_id
    where pg.granted_to_player_id = ${playerId}
      and pg.acquisition_method = 'earned'
      and pg.effect_detail ->> 'earn_trigger' = ${triggerKey}
      and r.game_id = ${gameId}
      and r.round_number >= ${sinceRoundNumber}
  `;
  return rows.length > 0;
}

async function grantEarned(exec: Exec, gameId: string, roundId: string, playerId: string, triggerKey: string) {
  const powerKey = await pickRandomEligiblePower(exec, gameId, playerId);
  if (!powerKey) return;
  await grantPower(exec, {
    gameId,
    roundId,
    powerKey,
    playerId,
    method: "earned",
    effectDetail: { earn_trigger: triggerKey },
  });
}

// Evaluated once per resolved round, only when the game didn't just end (no more play
// remains to reward otherwise). Covers 4 of the 5 algorithmic earn triggers
// (game-design v0.9 §8.4) -- "Called it" is deferred (needs a new prediction-submission
// mechanism, cut from this milestone).
export async function evaluateEarnTriggers(
  exec: Exec,
  game: Game,
  round: Round,
  tally: { targetPlayerId: string; voteCount: number }[],
  aliveRosterAfterIds: string[],
  eliminatedIds: Set<string>,
): Promise<void> {
  const topValues = topTwoDistinctVoteCounts(tally);
  const countByPlayer = new Map(tally.map((t) => [t.targetPlayerId, t.voteCount]));

  // Near-miss: top-two distinct vote-count values, ties intentionally inflate the group.
  for (const playerId of aliveRosterAfterIds) {
    const count = countByPlayer.get(playerId);
    if (count !== undefined && topValues.includes(count)) {
      await grantEarned(exec, game.id, round.id, playerId, "near_miss");
    }
  }

  // Ghost-mode: zero votes this round, and survived (excludes forfeit-eliminated
  // non-voters, who by definition also had zero votes but didn't "survive").
  for (const playerId of aliveRosterAfterIds) {
    if (!countByPlayer.has(playerId) && !eliminatedIds.has(playerId)) {
      await grantEarned(exec, game.id, round.id, playerId, "ghost_mode");
    }
  }

  const N = game.survival_streak_threshold;
  const recentRounds = await getRecentResolvedRounds(exec, game.id, round.round_number, N);
  if (recentRounds.length < N) return; // not enough tenure yet for either streak trigger

  // Tally depends only on the round, not the player -- compute each once and reuse
  // across every player's streak check below.
  const tallyByRoundId = new Map<string, { targetPlayerId: string; voteCount: number }[]>();
  for (const r of recentRounds) {
    tallyByRoundId.set(r.id, r.id === round.id ? tally : await tallyVotesForRound(exec, r.id));
  }
  const sinceRoundNumber = recentRounds[recentRounds.length - 1].round_number;

  for (const playerId of aliveRosterAfterIds) {
    const wasTopTargeted = recentRounds.map((r) => {
      const rTally = tallyByRoundId.get(r.id)!;
      const rTopValues = topTwoDistinctVoteCounts(rTally);
      const rCount = rTally.find((t) => t.targetPlayerId === playerId)?.voteCount;
      return rCount !== undefined && rTopValues.includes(rCount);
    });

    // Survival-streak: never top-targeted across the last N rounds.
    if (wasTopTargeted.every((v) => !v)) {
      if (!(await alreadyGrantedForTrigger(exec, playerId, "survival_streak", sinceRoundNumber, game.id))) {
        await grantEarned(exec, game.id, round.id, playerId, "survival_streak");
      }
    }

    // Underdog-run: "Near-miss, sustained" -- top-targeted every one of the last N
    // rounds, yet still alive. (Read as the coherent interpretation of "consistently
    // in the bottom-two most-voted" -- the literal safest-player reading doesn't match
    // "underdog" semantics.)
    if (wasTopTargeted.every((v) => v)) {
      if (!(await alreadyGrantedForTrigger(exec, playerId, "underdog_run", sinceRoundNumber, game.id))) {
        await grantEarned(exec, game.id, round.id, playerId, "underdog_run");
      }
    }
  }
}
