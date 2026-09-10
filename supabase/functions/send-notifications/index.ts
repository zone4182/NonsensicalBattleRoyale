import { errorResponse, jsonResponse, preflightResponse } from "../_shared/http.ts";
import { requireCronSecret } from "../_shared/auth.ts";
import { sql } from "../_shared/db.ts";
import { sendPushToPlayers } from "../_shared/push.ts";
import { DEADLINE_REMINDER_FRACTION } from "../_shared/constants.ts";
import type { Round } from "../_shared/types.ts";

// Scheduled, every 5 minutes (see schedule_send_notifications_cron migration). The
// only time-based (as opposed to event-driven) push this app sends -- "a round
// started" is fired directly by start-round/redeem-invite/resolve-round instead, since
// those already know the moment it happens. This one has to be a sweep because
// "10% of the voting window remains" is a point in time nothing else is watching.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    requireCronSecret(req);

    const db = sql();

    // Candidates: still open, not already reminded, and already past their own 10%
    // threshold -- computed in SQL so a round with an unusual (GM-overridden) window
    // is handled the same as any other, no special-casing here.
    const due = await db<Round[]>`
      select * from battle_royale.rounds
      where resolved_at is null
        and deadline_reminder_sent_at is null
        and voting_deadline_at > now()
        and now() >= voting_deadline_at - (voting_deadline_at - opens_at) * ${DEADLINE_REMINDER_FRACTION}
    `;

    let notifiedRounds = 0;
    for (const round of due) {
      const alivePlayers = await db<{ id: string }[]>`
        select id from battle_royale.players
        where game_id = ${round.game_id} and role = 'player' and status = 'alive' and is_bot = false
      `;

      await sendPushToPlayers(
        alivePlayers.map((p) => p.id),
        {
          title: "Time is almost up",
          body: `Less than ${Math.round(DEADLINE_REMINDER_FRACTION * 100)}% of the voting time is left in round ${round.round_number}.`,
          url: "/game",
        },
      );

      await db`update battle_royale.rounds set deadline_reminder_sent_at = now() where id = ${round.id}`;
      notifiedRounds++;
    }

    return jsonResponse({ notified_rounds: notifiedRounds });
  } catch (err) {
    return errorResponse(err);
  }
});
