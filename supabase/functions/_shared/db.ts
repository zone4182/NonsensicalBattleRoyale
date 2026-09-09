import postgres from "npm:postgres@3.4.4";

// The client never queries Postgres directly (ARCHITECTURE.md "Critical architectural
// rule") -- only Edge Functions do, via this direct Postgres connection (not
// supabase-js/PostgREST), which is what lets us use the `battle_royale` schema
// regardless of the project's PostgREST "exposed schemas" setting.
let client: ReturnType<typeof postgres> | null = null;

export function sql() {
  if (!client) {
    const url = Deno.env.get("SUPABASE_DB_URL");
    if (!url) throw new Error("SUPABASE_DB_URL is not set");
    client = postgres(url, { prepare: false });
  }
  return client;
}

// Anonymity-critical helpers. Every other table can be queried freely with sql()
// directly from function code, but `battle_royale.votes` must only ever be touched
// through these two functions -- never add a generic "select from votes" helper here.

// Takes the query executor explicitly (a transaction or the module client), same as
// every other helper below -- a caller inside db.begin() that instead reached for the
// module client here would insert against a connection that can't see this
// transaction's own uncommitted rows yet (e.g. a round it just created), and the
// insert's FK checks would fail.
export async function castVote(
  exec: ReturnType<typeof sql>,
  params: {
    roundId: string;
    voterPlayerId: string;
    targetPlayerId: string;
    isDoubleVote: boolean;
  },
): Promise<void> {
  await exec`
    insert into battle_royale.votes (round_id, voter_player_id, target_player_id, is_double_vote)
    values (${params.roundId}, ${params.voterPlayerId}, ${params.targetPlayerId}, ${params.isDoubleVote})
  `;
}

// Vote-change support (games.allow_vote_change): revokes a voter's own oldest active
// vote(s) in this round to make room for a fresh cast within their entitlement. Scoped
// to voter_player_id -- this is a voter replacing their own vote, not the anonymity-
// sensitive "which of MY votes got redirected/nulled by a power" cases above.
export async function revokeOldestActiveVotesForVoter(
  exec: ReturnType<typeof sql>,
  roundId: string,
  voterPlayerId: string,
  count: number,
): Promise<void> {
  await exec`
    update battle_royale.votes
    set revoked_at = now()
    where id in (
      select id from battle_royale.votes
      where round_id = ${roundId} and voter_player_id = ${voterPlayerId} and revoked_at is null
      order by cast_at asc
      limit ${count}
    )
  `;
}

export async function countActiveVotesForVoter(roundId: string, voterPlayerId: string): Promise<number> {
  const rows = await sql()<{ count: number }[]>`
    select count(*)::int as count
    from battle_royale.votes
    where round_id = ${roundId} and voter_player_id = ${voterPlayerId} and revoked_at is null
  `;
  return rows[0]?.count ?? 0;
}

// Joins vote rows to player identity, which is exactly the join the rest of the system
// must never perform -- only two sanctioned callers exist:
//   1. The end-of-game reveal path, once `game.phase === 'ended'` -- for every player.
//   2. gm-game-overview, GM-role-gated, anytime -- per the user's explicit decision that
//      "votes stay private until the end" was only ever a promise made to players, not a
//      restriction on the GM. Never expose this to a non-GM caller before game end.
// Only ever resolved rounds -- the live/open round's votes stay unrevealed even to the
// GM until it resolves, matching "no public vote reveal during play."
export interface VoteAttribution {
  round_id: string;
  round_number: number;
  voter_player_id: string;
  voter_display_name: string;
  target_player_id: string;
  target_display_name: string;
  is_double_vote: boolean;
  cast_at: string;
}

export async function revealVotesForGame(gameId: string): Promise<VoteAttribution[]> {
  return await sql()<VoteAttribution[]>`
    select
      v.round_id,
      r.round_number,
      voter.id as voter_player_id,
      voter.display_name as voter_display_name,
      target.id as target_player_id,
      target.display_name as target_display_name,
      v.is_double_vote,
      v.cast_at
    from battle_royale.votes v
    join battle_royale.rounds r on r.id = v.round_id
    join battle_royale.players voter on voter.id = v.voter_player_id
    join battle_royale.players target on target.id = v.target_player_id
    where r.game_id = ${gameId} and v.revoked_at is null and r.resolved_at is not null
    order by r.round_number asc, v.cast_at asc
  `;
}

// Anonymity-safe aggregate for round resolution: never exposes voter identity, only
// per-target counts. Do not widen this to return voter/target pairs together.
//
// Takes the query executor explicitly (a transaction or the module client) rather than
// always using sql() -- callers that mutate votes (Deflect/Null) and then re-tally in
// the same transaction MUST pass that transaction's `tx`, or this reads stale
// pre-mutation data from a separate connection that hasn't seen the uncommitted writes.
export async function tallyVotesForRound(
  exec: ReturnType<typeof sql>,
  roundId: string,
): Promise<{ targetPlayerId: string; voteCount: number }[]> {
  const rows = await exec<{ target_player_id: string; vote_count: number }[]>`
    select target_player_id, count(*)::int as vote_count
    from battle_royale.votes
    where round_id = ${roundId} and revoked_at is null
    group by target_player_id
  `;
  return rows.map((r) => ({ targetPlayerId: r.target_player_id, voteCount: r.vote_count }));
}

// Anonymity-safe: returns only which of the given players cast zero active votes this
// round -- set membership only, never which target they voted for.
export async function playersWithNoVoteInRound(roundId: string, alivePlayerIds: string[]): Promise<string[]> {
  if (alivePlayerIds.length === 0) return [];
  const rows = await sql()<{ voter_player_id: string }[]>`
    select distinct voter_player_id from battle_royale.votes
    where round_id = ${roundId} and revoked_at is null and voter_player_id in ${sql()(alivePlayerIds)}
  `;
  const voted = new Set(rows.map((r) => r.voter_player_id));
  return alivePlayerIds.filter((id) => !voted.has(id));
}

// Deflect's effect: flips one vote cast against `targetPlayerId` this round back onto
// its own caster, chosen at random among untouched votes. Sanctioned only for
// resolve-round's internal use inside its transaction -- the returned voter id must
// never leave that transaction (never appear in an HTTP response), matching the
// design's "the target never learns this happened."
export async function redirectOneVoteAgainstTarget(
  exec: ReturnType<typeof sql>,
  roundId: string,
  targetPlayerId: string,
  excludeVoteIds: string[],
): Promise<{ voteId: string; voterPlayerId: string } | null> {
  const rows =
    excludeVoteIds.length > 0
      ? await exec<{ id: string; voter_player_id: string }[]>`
          select id, voter_player_id from battle_royale.votes
          where round_id = ${roundId} and target_player_id = ${targetPlayerId} and revoked_at is null
            and not (id in ${exec(excludeVoteIds)})
          order by random()
          limit 1
        `
      : await exec<{ id: string; voter_player_id: string }[]>`
          select id, voter_player_id from battle_royale.votes
          where round_id = ${roundId} and target_player_id = ${targetPlayerId} and revoked_at is null
          order by random()
          limit 1
        `;
  const row = rows[0];
  if (!row) return null;

  await exec`
    update battle_royale.votes set target_player_id = ${row.voter_player_id} where id = ${row.id}
  `;
  return { voteId: row.id, voterPlayerId: row.voter_player_id };
}

// Null's effect: discards (revokes) one vote cast against `targetPlayerId` this round,
// chosen at random among untouched votes. Same sanctioning as redirectOneVoteAgainstTarget.
export async function revokeOneVoteAgainstTarget(
  exec: ReturnType<typeof sql>,
  roundId: string,
  targetPlayerId: string,
  excludeVoteIds: string[],
): Promise<{ voteId: string } | null> {
  const rows =
    excludeVoteIds.length > 0
      ? await exec<{ id: string }[]>`
          select id from battle_royale.votes
          where round_id = ${roundId} and target_player_id = ${targetPlayerId} and revoked_at is null
            and not (id in ${exec(excludeVoteIds)})
          order by random()
          limit 1
        `
      : await exec<{ id: string }[]>`
          select id from battle_royale.votes
          where round_id = ${roundId} and target_player_id = ${targetPlayerId} and revoked_at is null
          order by random()
          limit 1
        `;
  const row = rows[0];
  if (!row) return null;

  await exec`update battle_royale.votes set revoked_at = now() where id = ${row.id}`;
  return { voteId: row.id };
}

// Not vote-table-related. Returns the last `limit` resolved rounds up to (and
// including) `uptoRoundNumber` for a game, oldest last -- used by the earn-trigger
// lookback (survival-streak, underdog-run) to check recent round history.
export async function getRecentResolvedRounds(
  exec: ReturnType<typeof sql>,
  gameId: string,
  uptoRoundNumber: number,
  limit: number,
): Promise<{ id: string; round_number: number }[]> {
  return await exec<{ id: string; round_number: number }[]>`
    select id, round_number from battle_royale.rounds
    where game_id = ${gameId} and resolved_at is not null and round_number <= ${uptoRoundNumber}
    order by round_number desc
    limit ${limit}
  `;
}

// Not vote-table-related. Picks a random alive role='player' player for the next
// round's double-vote slot, avoiding whoever held it in the last `floorRounds` rounds
// when an alternative exists (flat random otherwise -- exact cadence numbers are an
// open game-design question, not something to over-engineer here). Takes the query
// executor (a transaction or the module client) so it can participate in an ongoing
// transaction.
export async function pickDoubleVoteHolder(
  exec: ReturnType<typeof sql>,
  gameId: string,
  floorRounds: number,
): Promise<string | null> {
  const alive = await exec<{ id: string }[]>`
    select id from battle_royale.players where game_id = ${gameId} and status = 'alive' and role = 'player'
  `;
  if (alive.length === 0) return null;

  const recentHolders = await exec<{ double_vote_player_id: string | null }[]>`
    select double_vote_player_id from battle_royale.rounds
    where game_id = ${gameId} and double_vote_player_id is not null
    order by round_number desc
    limit ${floorRounds}
  `;
  const excluded = new Set(recentHolders.map((r) => r.double_vote_player_id));
  const eligible = alive.filter((p) => !excluded.has(p.id));
  const pool = eligible.length > 0 ? eligible : alive;
  return pool[Math.floor(Math.random() * pool.length)].id;
}
