import { errorResponse, HttpError, jsonResponse, preflightResponse, readJsonBody } from "../_shared/http.ts";
import { authenticate, requireAlive, requireRole } from "../_shared/auth.ts";
import { sql, tallyVotesForRound } from "../_shared/db.ts";
import { requirePositiveInt, requireString } from "../_shared/validation.ts";
import type { PowerGrant, Round } from "../_shared/types.ts";

const IN_SCOPE_POWERS = new Set(["rewind", "whisper", "watcher", "ward", "deflect", "null"]);
const ARM_FOR_ROUND_POWERS = new Set(["ward", "deflect", "null"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const ctx = await authenticate(req);
    requireRole(ctx, "player");
    requireAlive(ctx);

    const body = await readJsonBody<Record<string, unknown>>(req);
    const powerKey = requireString(body, "power_key");

    const db = sql();

    const [catalogueEntry] = await db`select key from battle_royale.powers_catalogue where key = ${powerKey}`;
    if (!catalogueEntry) {
      throw new HttpError(400, "unknown_power", "No such power exists.");
    }

    if (!IN_SCOPE_POWERS.has(powerKey)) {
      throw new HttpError(409, "power_not_implemented", "This power isn't playable yet.");
    }

    const result = await db.begin(async (tx) => {
      const grants = await tx<PowerGrant[]>`
        select * from battle_royale.power_grants
        where granted_to_player_id = ${ctx.player.id} and power_key = ${powerKey} and used_at is null
        order by granted_at asc
        limit 1
        for update
      `;
      const grant = grants[0];
      if (!grant) {
        throw new HttpError(403, "power_not_available", "You do not hold an unused grant of this power.");
      }

      if (ARM_FOR_ROUND_POWERS.has(powerKey)) {
        const rounds = await tx<Round[]>`
          select * from battle_royale.rounds
          where game_id = ${ctx.game.id} and resolved_at is null
          order by round_number desc
          limit 1
        `;
        const round = rounds[0];
        if (!round) {
          throw new HttpError(409, "no_open_round", "There is no open round to arm this power for.");
        }

        await tx`
          update battle_royale.power_grants
          set used_at = now(), effect_status = 'pending',
            effect_detail = ${tx.json({ armed_for_round_id: round.id, armed_for_round_number: round.round_number })}
          where id = ${grant.id}
        `;

        return { status: "armed" as const, power_key: powerKey, round_number: round.round_number };
      }

      if (powerKey === "rewind") {
        const roundNumber = requirePositiveInt(body, "round_number");
        const [round] = await tx<Round[]>`
          select * from battle_royale.rounds
          where game_id = ${ctx.game.id} and round_number = ${roundNumber} and resolved_at is not null
        `;
        if (!round) {
          throw new HttpError(400, "invalid_round", "That round hasn't been resolved yet, or doesn't exist.");
        }

        const tally = await tallyVotesForRound(tx, round.id);
        await tx`
          update battle_royale.power_grants
          set used_at = now(), effect_status = 'resolved',
            effect_detail = ${tx.json({ viewed_round_id: round.id, viewed_round_number: roundNumber })}
          where id = ${grant.id}
        `;

        return {
          status: "resolved" as const,
          power_key: powerKey,
          round_number: roundNumber,
          tally: tally.map((t) => ({ target_player_id: t.targetPlayerId, vote_count: t.voteCount })),
        };
      }

      if (powerKey === "whisper") {
        const [prevRound] = await tx<Round[]>`
          select * from battle_royale.rounds
          where game_id = ${ctx.game.id} and resolved_at is not null
          order by round_number desc
          limit 1
        `;
        if (!prevRound) {
          throw new HttpError(409, "no_prior_round_yet", "No round has been resolved yet.");
        }

        const tally = await tallyVotesForRound(tx, prevRound.id);
        const maxVotes = tally.length > 0 ? Math.max(...tally.map((t) => t.voteCount)) : 0;
        const wereYouTopTarget = tally.some((t) => t.targetPlayerId === ctx.player.id && t.voteCount === maxVotes);

        await tx`
          update battle_royale.power_grants
          set used_at = now(), effect_status = 'resolved',
            effect_detail = ${tx.json({ checked_round_id: prevRound.id })}
          where id = ${grant.id}
        `;

        return { status: "resolved" as const, power_key: powerKey, were_you_top_target: wereYouTopTarget };
      }

      // watcher
      const [round] = await tx<Round[]>`
        select * from battle_royale.rounds
        where game_id = ${ctx.game.id} and resolved_at is null
        order by round_number desc
        limit 1
      `;
      if (!round) {
        throw new HttpError(409, "no_open_round", "There is no open round to check.");
      }

      await tx`
        update battle_royale.power_grants
        set used_at = now(), effect_status = 'resolved',
          effect_detail = ${tx.json({ checked_round_id: round.id })}
        where id = ${grant.id}
      `;

      return { status: "resolved" as const, power_key: powerKey, double_vote_player_id: round.double_vote_player_id };
    });

    return jsonResponse({ ok: true, ...result });
  } catch (err) {
    return errorResponse(err);
  }
});
