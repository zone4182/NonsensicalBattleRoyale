import { errorResponse, jsonResponse, preflightResponse } from "../_shared/http.ts";
import { requireCronSecret } from "../_shared/auth.ts";
import { sql } from "../_shared/db.ts";
import type { Round } from "../_shared/types.ts";

const LOOKAHEAD_MINUTES = 15;

// Scheduled function. Stub: logs delivery intent instead of sending Web Push -- no
// VAPID wiring this milestone.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    requireCronSecret(req);

    const db = sql();
    const upcoming = await db<Round[]>`
      select * from battle_royale.rounds
      where resolved_at is null
        and voting_deadline_at between now() and now() + (${LOOKAHEAD_MINUTES} || ' minutes')::interval
    `;

    for (const round of upcoming) {
      // TODO: send Web Push via VAPID once wired up; native push (APNs/FCM) later.
      console.log(`[send-notifications] deadline reminder due for round ${round.id} (game ${round.game_id})`);
    }

    return jsonResponse({ reminder_count: upcoming.length });
  } catch (err) {
    return errorResponse(err);
  }
});
