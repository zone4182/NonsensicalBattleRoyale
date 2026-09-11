import { errorResponse, jsonResponse, preflightResponse, readJsonBody } from "../_shared/http.ts";
import { requireCronOrGmForGame } from "../_shared/auth.ts";
import { sql } from "../_shared/db.ts";
import type { Game } from "../_shared/types.ts";

// Scheduled function, deliberately separate from resolve-round (per user decision):
// Three Doors (game-design v0.9 section 14) is a single per-game event with its own
// collision-detection algorithm, not a round-deadline vote tally. Invoked either by
// cron (x-cron-secret, unscoped or scoped by body.game_id) or by a GM's own "Resolve
// doors" click (bearer token, hard-scoped to their game) -- same dual path as
// resolve-round.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const body = await readJsonBody<Record<string, unknown>>(req).catch(() => ({}) as Record<string, unknown>);
    const bodyGameId = typeof body.game_id === "string" ? body.game_id : undefined;
    const scopedGameId = await requireCronOrGmForGame(req, bodyGameId);

    const db = sql();
    const activeDoorGames = scopedGameId
      ? await db<Game[]>`select * from battle_royale.games where phase = 'three_doors' and finished_at is null and id = ${scopedGameId}`
      : await db<Game[]>`select * from battle_royale.games where phase = 'three_doors' and finished_at is null`;

    let resolvedCount = 0;

    for (const game of activeDoorGames) {
      // role = 'player' -- the GM's own row is also status = 'alive' (never
      // eliminated), but the GM never submits a door pick (submit-door-pick requires
      // role 'player'), so leaving this unfiltered meant picks.length could never
      // reach alivePlayers.length and no game could ever resolve.
      const alivePlayers = await db<{ id: string }[]>`
        select id from battle_royale.players where game_id = ${game.id} and status = 'alive' and role = 'player'
      `;
      const picks = await db<{ player_id: string; door_number: number }[]>`
        select player_id, door_number from battle_royale.door_picks
        where game_id = ${game.id} and resolved_outcome is null
      `;

      // Resolve early once every remaining player has picked; otherwise only resolve
      // once the GM-set deadline (games.three_doors_deadline_minutes, stamped from the
      // moment the game entered this phase) has actually passed.
      const deadlinePassed =
        game.three_doors_phase_started_at !== null &&
        Date.now() >= new Date(game.three_doors_phase_started_at).getTime() + game.three_doors_deadline_minutes * 60_000;
      if (picks.length < alivePlayers.length && !deadlinePassed) continue;

      // A timed-out incomplete pick set is treated exactly like a door collision --
      // there's no way to know who "would have" picked the winning door, so whoever's
      // still standing (including anyone who never picked at all) loses. Mirrors the
      // round-vote deadline's own "nothing chosen in time still has a consequence"
      // principle, just with a single fixed outcome instead of missed_deadline_mode's
      // three options.
      const timedOutIncomplete = picks.length < alivePlayers.length;

      const doorNumbers = picks.map((p) => p.door_number);
      const hasCollision = timedOutIncomplete || new Set(doorNumbers).size !== doorNumbers.length;

      await db.begin(async (tx) => {
        if (hasCollision) {
          // Any collision at all -- two picking the same door, or all three -- kills
          // everyone. Which door was actually correct never matters in this case.
          // (A timed-out incomplete set falls in here too -- whoever DID pick just gets
          // marked lose_all same as a real collision; whoever never picked at all has
          // no door_picks row to update and simply has none, same as before.)
          await tx`
            update battle_royale.door_picks set resolved_outcome = 'lose_all'
            where game_id = ${game.id} and resolved_outcome is null
          `;
        } else {
          // All three picks unique: only whoever picked the one door chosen as
          // correct back when the game entered this phase survives. The other two
          // picked a real exit, just not the one that was open.
          for (const pick of picks) {
            const outcome = pick.door_number === game.three_doors_winning_door ? "win" : "lose";
            await tx`
              update battle_royale.door_picks set resolved_outcome = ${outcome}
              where game_id = ${game.id} and player_id = ${pick.player_id}
            `;
          }
        }
        await tx`
          update battle_royale.games set phase = 'ended' where id = ${game.id}
        `;
      });

      resolvedCount++;
    }

    return jsonResponse({ resolved_count: resolvedCount });
  } catch (err) {
    return errorResponse(err);
  }
});
