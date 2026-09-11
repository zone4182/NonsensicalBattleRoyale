import { errorResponse, jsonResponse, preflightResponse, readJsonBody } from "../_shared/http.ts";
import { requireCronOrGmForGame } from "../_shared/auth.ts";
import {
  countActiveVotesForVoter,
  pickDoubleVoteHolder,
  playersWithNoVoteInRound,
  redirectOneVoteAgainstTarget,
  revokeOneVoteAgainstTarget,
  sql,
  tallyVotesForRound,
} from "../_shared/db.ts";
import { evaluateEarnTriggers, grantRandomDrop } from "../_shared/powers.ts";
import { castBotDoorPicks, castBotVotes } from "../_shared/bots.ts";
import { sendPushToPlayers } from "../_shared/push.ts";
import { publicName } from "../_shared/names.ts";
import type { Game, Player, PowerGrant, Round } from "../_shared/types.ts";

interface Resolution {
  round_id: string;
  round_number: number;
  eliminated_player_ids: string[];
  tie_break_method: "none" | "random";
  new_phase: Game["phase"];
}

// A round is "due" once its deadline passes, or -- only for a scoped call (a GM's own
// "Resolve now" click, hard-scoped to their game; a scoped cron call is theoretically
// possible via body.game_id but nothing currently sends one) -- as soon as every alive
// player has used their full vote entitlement. There's nothing left to wait for once
// that's true, so a GM shouldn't have to sit out the rest of the deadline.
async function getDueRoundsForGame(db: ReturnType<typeof sql>, gameId: string): Promise<Round[]> {
  const openRounds = await db<Round[]>`
    select * from battle_royale.rounds where resolved_at is null and game_id = ${gameId}
  `;

  const due: Round[] = [];
  for (const round of openRounds) {
    if (new Date(round.voting_deadline_at) <= new Date()) {
      due.push(round);
      continue;
    }

    const aliveRoster = await db<{ id: string }[]>`
      select id from battle_royale.players where game_id = ${gameId} and status = 'alive' and role = 'player'
    `;
    if (aliveRoster.length === 0) continue;

    let allVoted = true;
    for (const player of aliveRoster) {
      const entitlement = round.double_vote_player_id === player.id ? 2 : 1;
      const cast = await countActiveVotesForVoter(round.id, player.id);
      if (cast < entitlement) {
        allVoted = false;
        break;
      }
    }
    if (allVoted) due.push(round);
  }
  return due;
}

// Invoked either by cron (x-cron-secret, unscoped or scoped by body.game_id) or by a
// GM's "Resolve now" button (bearer token, hard-scoped to their own game). The unscoped
// cron sweep (games.round_resolution_mode "automatic") is the only path that never
// early-resolves -- it only ever acts once a deadline has actually passed.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const body = await readJsonBody<Record<string, unknown>>(req).catch(() => ({}) as Record<string, unknown>);
    const bodyGameId = typeof body.game_id === "string" ? body.game_id : undefined;
    const scopedGameId = await requireCronOrGmForGame(req, bodyGameId);

    const db = sql();
    const dueRounds = scopedGameId
      ? await getDueRoundsForGame(db, scopedGameId)
      : await db<Round[]>`
          select r.* from battle_royale.rounds r
          join battle_royale.games g on g.id = r.game_id
          where r.resolved_at is null and r.voting_deadline_at <= now()
            and g.round_resolution_mode = 'automatic' and g.finished_at is null
        `;

    const resolutions: Resolution[] = [];
    const roundStartNotifications: { roundNumber: number; playerIds: string[] }[] = [];

    for (const round of dueRounds) {
      const resolution = await db.begin(async (tx) => {
        const [game] = await tx<Game[]>`select * from battle_royale.games where id = ${round.game_id}`;

        const aliveRoster = await tx<Player[]>`
          select * from battle_royale.players
          where game_id = ${game.id} and status = 'alive' and role = 'player'
        `;
        const aliveIds = aliveRoster.map((p) => p.id);
        const nameById = new Map(aliveRoster.map((p) => [p.id, publicName(p.display_name, p.chosen_display_name)]));

        // Armed defensive grants for THIS round -- all of them are resolved one way or
        // another by the end of this transaction, since their armed window has passed
        // regardless of whether they ended up mattering.
        const armedDefensive = await tx<PowerGrant[]>`
          select * from battle_royale.power_grants
          where game_id = ${game.id}
            and power_key in ('ward', 'deflect', 'null')
            and used_at is not null
            and effect_status = 'pending'
            and (effect_detail ->> 'armed_for_round_id') = ${round.id}
        `;
        const wardGrants = armedDefensive.filter((g) => g.power_key === "ward");
        const deflectGrants = armedDefensive.filter((g) => g.power_key === "deflect");
        const nullGrants = armedDefensive.filter((g) => g.power_key === "null");

        // Deflect/Null must adjust the effective vote tally BEFORE top-target
        // determination -- they mutate the underlying votes rows first, then the
        // tally below is re-derived fresh from those mutations (single source of
        // truth, accurate audit trail).
        const claimedVoteIds: string[] = [];
        const grantOutcomes = new Map<string, Record<string, unknown>>();

        for (const grant of deflectGrants) {
          const result = await redirectOneVoteAgainstTarget(tx, round.id, grant.granted_to_player_id, claimedVoteIds);
          if (result) {
            claimedVoteIds.push(result.voteId);
            grantOutcomes.set(grant.id, { redirected: true });
          } else {
            grantOutcomes.set(grant.id, { redirected: false });
          }
        }
        for (const grant of nullGrants) {
          const result = await revokeOneVoteAgainstTarget(tx, round.id, grant.granted_to_player_id, claimedVoteIds);
          if (result) {
            claimedVoteIds.push(result.voteId);
            grantOutcomes.set(grant.id, { revoked: true });
          } else {
            grantOutcomes.set(grant.id, { revoked: false });
          }
        }

        const tally = await tallyVotesForRound(tx, round.id);
        const nonVoters = await playersWithNoVoteInRound(round.id, aliveIds);

        let eliminatedByVote: string | null = null;
        let tieBreakMethod: "none" | "random" | "no_elimination" = "none";
        if (tally.length > 0) {
          const maxVotes = Math.max(...tally.map((t) => t.voteCount));
          const topTargets = tally.filter((t) => t.voteCount === maxVotes).map((t) => t.targetPlayerId);
          if (topTargets.length === 1) {
            eliminatedByVote = topTargets[0];
          } else if (game.tie_break_mode === "no_elimination") {
            // GM-configured alternative to the coin flip below: a tie means no one
            // dies this round at all, rather than randomly picking among the tied.
            tieBreakMethod = "no_elimination";
          } else {
            eliminatedByVote = topTargets[Math.floor(Math.random() * topTargets.length)];
            tieBreakMethod = "random";
          }
        }

        const forfeitedIds: string[] = [];
        if (game.missed_deadline_mode === "one_round_penalty" && nonVoters.length > 0) {
          await tx`
            update battle_royale.players
            set vote_suspended_through_round_number = ${round.round_number + 1}
            where id in ${tx(nonVoters)}
          `;
        } else if (game.missed_deadline_mode === "forfeit_fatal") {
          forfeitedIds.push(...nonVoters);
        }

        const eliminatedIds = new Set<string>(forfeitedIds);
        if (eliminatedByVote) eliminatedIds.add(eliminatedByVote);

        // Ward: blanket immunity for one round, covering both vote-based and
        // forfeit-based elimination. Checked after elimination is assembled, before
        // it's written.
        const wardSavedIds: string[] = [];
        for (const grant of wardGrants) {
          const playerId = grant.granted_to_player_id;
          if (eliminatedIds.has(playerId)) {
            eliminatedIds.delete(playerId);
            wardSavedIds.push(playerId);
            if (eliminatedByVote === playerId) eliminatedByVote = null;
            grantOutcomes.set(grant.id, { saved_from_elimination: true });
          } else {
            grantOutcomes.set(grant.id, { saved_from_elimination: false });
          }
        }

        // Resolve every armed defensive grant evaluated this round -- pending is only
        // ever left behind for grants that weren't due this round.
        for (const grant of armedDefensive) {
          const outcome = grantOutcomes.get(grant.id) ?? {};
          const hadEffect =
            outcome.saved_from_elimination === true || outcome.redirected === true || outcome.revoked === true;
          await tx`
            update battle_royale.power_grants
            set effect_status = ${hadEffect ? "resolved" : "no_effect"},
              effect_detail = ${tx.json({ ...(grant.effect_detail as Record<string, unknown>), ...outcome })}
            where id = ${grant.id}
          `;
        }

        if (eliminatedIds.size > 0) {
          await tx`
            update battle_royale.players
            set status = 'ghost', eliminated_in_round_id = ${round.id}
            where id in ${tx([...eliminatedIds])}
          `;
        }

        // Narration: flavor text describing what actually happened this round.
        let narration: string;
        if (eliminatedByVote) {
          const name = nameById.get(eliminatedByVote) ?? "someone";
          narration =
            tieBreakMethod === "random"
              ? `Round ${round.round_number} ends in a dead-even tie. Fate (and a coin toss) chose ${name} to be eliminated.`
              : `Round ${round.round_number} is over. The house has spoken: ${name} is eliminated.`;
        } else if (tieBreakMethod === "no_elimination") {
          narration = `Round ${round.round_number} ends in a dead-even tie. Fortunately, everyone lives to see another day.`;
        } else if (tally.length > 0) {
          narration = `Round ${round.round_number} is over. The votes are in, but the house's chosen target walks away unharmed.`;
        } else {
          narration = `Round ${round.round_number} ends in silence. No one cast a single vote, and no one was eliminated by vote.`;
        }
        if (forfeitedIds.length > 0) {
          const names = forfeitedIds.map((id) => nameById.get(id) ?? "someone").join(", ");
          narration += ` ${names} also forfeited the round by casting no vote and paid the price.`;
        } else if (game.missed_deadline_mode === "one_round_penalty" && nonVoters.length > 0) {
          const names = nonVoters.map((id) => nameById.get(id) ?? "someone").join(", ");
          narration += ` ${names} missed the deadline and will sit out voting next round.`;
        }
        if (wardSavedIds.length > 0) {
          const names = wardSavedIds.map((id) => nameById.get(id) ?? "someone").join(", ");
          narration += ` ${names} had already secured protection and survives unscathed.`;
        }

        await tx`
          update battle_royale.rounds
          set resolved_at = now(), eliminated_player_id = ${eliminatedByVote}, tie_break_method = ${tieBreakMethod}
          where id = ${round.id}
        `;
        await tx`
          insert into battle_royale.narration_log (game_id, round_id, body)
          values (${game.id}, ${round.id}, ${narration})
        `;

        const aliveIdsAfter = aliveIds.filter((id) => !eliminatedIds.has(id));
        const aliveCountAfter = aliveIdsAfter.length;

        let newPhase: Game["phase"] = "active";
        if (aliveCountAfter <= 1) {
          newPhase = "ended";
          await tx`update battle_royale.games set phase = 'ended' where id = ${game.id}`;
        } else if (aliveCountAfter === 3) {
          newPhase = "three_doors";
          // The one real mechanic: a single door is secretly correct, chosen now and
          // never exposed anywhere before resolve-doors uses it. All three doors are
          // labeled "Exit" in the UI specifically so this stays hidden.
          const winningDoor = 1 + Math.floor(Math.random() * 3);
          await tx`update battle_royale.games set phase = 'three_doors', three_doors_winning_door = ${winningDoor} where id = ${game.id}`;
          const aliveBotIdsAfter = aliveRoster.filter((p) => p.is_bot && aliveIdsAfter.includes(p.id)).map((p) => p.id);
          await castBotDoorPicks(tx, game.id, aliveBotIdsAfter);
        } else {
          const doubleVotePlayerId = game.double_vote_enabled
            ? await pickDoubleVoteHolder(tx, game.id, game.double_vote_floor_rounds)
            : null;
          const [newRound] = await tx`
            insert into battle_royale.rounds (game_id, round_number, opens_at, voting_deadline_at, double_vote_player_id)
            values (
              ${game.id},
              ${round.round_number + 1},
              now(),
              now() + (${game.round_interval_minutes} || ' minutes')::interval,
              ${doubleVotePlayerId}
            )
            returning id
          `;
          await grantRandomDrop(tx, game.id, newRound.id, aliveIdsAfter);
          await castBotVotes(tx, game.id, newRound.id, doubleVotePlayerId);
          roundStartNotifications.push({ roundNumber: round.round_number + 1, playerIds: aliveIdsAfter });
        }

        // Earn triggers: only when there's still a game left to play for.
        if (aliveCountAfter > 1) {
          await evaluateEarnTriggers(tx, game, round, tally, aliveIdsAfter, eliminatedIds);
        }

        return {
          round_id: round.id,
          round_number: round.round_number,
          eliminated_player_ids: [...eliminatedIds],
          tie_break_method: tieBreakMethod,
          new_phase: newPhase,
        } satisfies Resolution;
      });

      resolutions.push(resolution);
    }

    // Outside every transaction -- see start-round's identical comment.
    for (const notification of roundStartNotifications) {
      await sendPushToPlayers(notification.playerIds, {
        title: `Round ${notification.roundNumber} has started`,
        body: "Voting is open -- head to the app to cast your vote.",
        url: "/game",
      });
    }

    return jsonResponse({ resolved_count: resolutions.length, resolutions });
  } catch (err) {
    return errorResponse(err);
  }
});
