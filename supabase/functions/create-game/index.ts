import { errorResponse, jsonResponse, preflightResponse, readJsonBody } from "../_shared/http.ts";
import { requireSetupSecret } from "../_shared/auth.ts";
import { sql } from "../_shared/db.ts";
import { requireOneOf, requirePositiveInt, requireString } from "../_shared/validation.ts";
import { generateInviteToken } from "../_shared/tokens.ts";
import type { MissedDeadlineMode, Round1StartMode } from "../_shared/types.ts";

const MISSED_DEADLINE_MODES: readonly MissedDeadlineMode[] = ["forfeit_fatal", "no_consequence", "one_round_penalty"];
const ROUND1_START_MODES: readonly Round1StartMode[] = ["wait_for_all", "gm_manual", "scheduled"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    // No invite token exists yet at this point, so this is the one endpoint gated by a
    // shared setup secret instead of authenticate() (confirmed with the user).
    requireSetupSecret(req);

    const body = await readJsonBody<Record<string, unknown>>(req);
    const name = requireString(body, "name");
    const gmDisplayName = requireString(body, "gm_display_name");
    const roundIntervalMinutes = requirePositiveInt(body, "round_interval_minutes");
    const missedDeadlineMode = requireOneOf(body, "missed_deadline_mode", MISSED_DEADLINE_MODES);
    const round1StartMode = requireOneOf(body, "round1_start_mode", ROUND1_START_MODES);

    const db = sql();

    const result = await db.begin(async (tx) => {
      const [game] = await tx`
        insert into battle_royale.games (name, round_interval_minutes, missed_deadline_mode, round1_start_mode)
        values (${name}, ${roundIntervalMinutes}, ${missedDeadlineMode}, ${round1StartMode})
        returning id
      `;

      const gmToken = generateInviteToken();
      const [gmInvite] = await tx`
        insert into battle_royale.invites (game_id, token, display_name, role)
        values (${game.id}, ${gmToken}, ${gmDisplayName}, 'gm')
        returning id, token
      `;

      await tx`
        insert into battle_royale.game_power_settings (game_id, power_key, enabled)
        select ${game.id}, key, default_enabled from battle_royale.powers_catalogue
      `;

      return { gameId: game.id as string, gmToken: gmInvite.token as string };
    });

    return jsonResponse({ game_id: result.gameId, gm_invite_token: result.gmToken }, 201);
  } catch (err) {
    return errorResponse(err);
  }
});
