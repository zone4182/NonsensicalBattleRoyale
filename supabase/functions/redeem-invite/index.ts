import { errorResponse, HttpError, jsonResponse, preflightResponse, readJsonBody } from "../_shared/http.ts";
import { sql } from "../_shared/db.ts";
import { castBotPrologueVotes } from "../_shared/bots.ts";
import { sendPushToPlayers } from "../_shared/push.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { optionalStringMaxLength, requireString } from "../_shared/validation.ts";
import { MIN_PLAYERS_TO_START } from "../_shared/constants.ts";
import { publicName } from "../_shared/names.ts";
import { initPlayerRoom } from "../_shared/roomMovement.ts";
import { PROLOGUE_KITCHEN_NARRATION } from "../_shared/story.ts";
import type { Game, Invite } from "../_shared/types.ts";

// Not authenticated via authenticate() -- the invite isn't redeemed yet, so there's no
// player identity to resolve. The token itself is the only credential.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    // 10 attempts per 30 minutes per client IP, counted regardless of whether the
    // token turns out to be valid -- security-review finding: this endpoint had no
    // brute-force throttling on token guesses.
    await enforceRateLimit(req, "redeem-invite", 10, 30);

    const body = await readJsonBody<Record<string, unknown>>(req);
    const token = requireString(body, "token");
    const chosenDisplayName = optionalStringMaxLength(body, "display_name", 60);

    const db = sql();
    const result = await db.begin(async (tx) => {
      const invites = await tx<Invite[]>`
        select * from battle_royale.invites where token = ${token}
      `;
      const invite = invites[0];
      if (!invite) {
        throw new HttpError(404, "invite_not_found", "No invite exists for this token.");
      }
      if (invite.redeemed_at) {
        throw new HttpError(409, "already_redeemed", "This invite has already been redeemed.");
      }

      const [player] = await tx`
        insert into battle_royale.players (game_id, invite_id, role, display_name, chosen_display_name)
        values (${invite.game_id}, ${invite.id}, ${invite.role}, ${invite.display_name}, ${chosenDisplayName ?? null})
        returning id
      `;

      await tx`
        update battle_royale.invites set redeemed_at = now() where id = ${invite.id}
      `;

      const [game] = await tx<Game[]>`
        select * from battle_royale.games where id = ${invite.game_id}
      `;

      if (game.move_to_room_enabled) {
        await initPlayerRoom(tx, game.id, player.id);
      }

      let gamePhase: string = game.phase;
      let newRoundPlayerIds: string[] | null = null;

      // wait_for_all: round 1 starts automatically the moment the last invited player
      // redeems -- event-driven off this write, needs no cron. Still subject to the
      // GAME-DESIGN.md "Scale" minimum -- a fully-redeemed roster under that floor just
      // stays in setup until the GM invites enough people (or overrides via start-round,
      // which enforces the same minimum).
      if (game.round1_start_mode === "wait_for_all" && game.phase === "setup") {
        const [{ unredeemed_count }] = await tx<{ unredeemed_count: number }[]>`
          select count(*)::int as unredeemed_count from battle_royale.invites
          where game_id = ${game.id} and redeemed_at is null
        `;
        const [{ player_count }] = await tx<{ player_count: number }[]>`
          select count(*)::int as player_count from battle_royale.players
          where game_id = ${game.id} and role = 'player'
        `;
        if (unredeemed_count === 0 && player_count >= MIN_PLAYERS_TO_START) {
          // Round 1 is always the "prologue round" now -- see start-round's identical
          // comment. No double vote, no power grants, no Move-to-Room until round 2.
          const [round] = await tx`
            insert into battle_royale.rounds (game_id, round_number, opens_at, voting_deadline_at, double_vote_player_id, is_prologue)
            values (
              ${game.id},
              1,
              now(),
              now() + (${game.round_interval_minutes} || ' minutes')::interval,
              null,
              true
            )
            returning id
          `;
          await tx`update battle_royale.games set phase = 'active' where id = ${game.id}`;
          gamePhase = "active";

          await tx`
            insert into battle_royale.narration_log (game_id, round_id, body)
            values (${game.id}, ${round.id}, ${PROLOGUE_KITCHEN_NARRATION})
          `;

          const aliveRoster = await tx<{ id: string }[]>`
            select id from battle_royale.players where game_id = ${game.id} and status = 'alive' and role = 'player'
          `;
          await castBotPrologueVotes(tx, game.id, round.id);
          newRoundPlayerIds = aliveRoster.map((p) => p.id);
        }
      }

      return {
        playerId: player.id as string,
        role: invite.role,
        gameId: invite.game_id,
        gamePhase,
        displayName: publicName(invite.display_name, chosenDisplayName ?? null),
        newRoundPlayerIds,
      };
    });

    // Outside the transaction -- see start-round's identical comment.
    if (result.newRoundPlayerIds) {
      await sendPushToPlayers(result.newRoundPlayerIds, {
        title: "Round 1 has started",
        body: "Voting is open -- head to the app to cast your vote.",
        url: "/game",
      });
    }

    // Arrival prologue content (game-design v0.9 section 3a) is a frontend concern --
    // no content/state is generated for it here yet.
    return jsonResponse({
      player_id: result.playerId,
      role: result.role,
      game_id: result.gameId,
      game_phase: result.gamePhase,
      display_name: result.displayName,
    });
  } catch (err) {
    return errorResponse(err);
  }
});
