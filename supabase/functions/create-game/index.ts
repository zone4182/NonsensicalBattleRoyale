import { errorResponse, jsonResponse, preflightResponse, readJsonBody } from "../_shared/http.ts";
import { requireSetupSecret } from "../_shared/auth.ts";
import { sql } from "../_shared/db.ts";
import {
  optionalBoolean,
  optionalIntInRange,
  optionalIntInRangeOrSentinel,
  optionalOneOf,
  requireIntAtLeast,
  requireOneOf,
  requireString,
} from "../_shared/validation.ts";
import { generateInviteToken } from "../_shared/tokens.ts";
import { createBotPlayers } from "../_shared/bots.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { MIN_ROUND_INTERVAL_MINUTES } from "../_shared/constants.ts";
import type { MissedDeadlineMode, Round1StartMode, RoundResolutionMode } from "../_shared/types.ts";

const MISSED_DEADLINE_MODES: readonly MissedDeadlineMode[] = ["forfeit_fatal", "no_consequence", "one_round_penalty"];
const ROUND1_START_MODES: readonly Round1StartMode[] = ["wait_for_all", "gm_manual", "scheduled"];
const ROUND_RESOLUTION_MODES: readonly RoundResolutionMode[] = ["automatic", "manual"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    // 10 attempts per 30 minutes per client IP, counted regardless of whether the
    // secret check below passes -- security-review finding: this endpoint's shared
    // secret had no brute-force throttling at all. Checked before the secret itself so
    // guesses always count, successful or not.
    await enforceRateLimit(req, "create-game", 10, 30);

    // No invite token exists yet at this point, so this is the one endpoint gated by a
    // shared setup secret instead of authenticate() (confirmed with the user).
    requireSetupSecret(req);

    const body = await readJsonBody<Record<string, unknown>>(req);
    const name = requireString(body, "name");
    const gmDisplayName = requireString(body, "gm_display_name");
    const roundIntervalMinutes = requireIntAtLeast(body, "round_interval_minutes", MIN_ROUND_INTERVAL_MINUTES);
    const missedDeadlineMode = requireOneOf(body, "missed_deadline_mode", MISSED_DEADLINE_MODES);
    const round1StartMode = requireOneOf(body, "round1_start_mode", ROUND1_START_MODES);
    // Bot Mode (concept/bot-mode/BOT-MODE.md) -- optional, defaults to no bots.
    const botCount = optionalIntInRange(body, "bot_count", 1, 19) ?? 0;
    const roundResolutionMode = optionalOneOf(body, "round_resolution_mode", ROUND_RESOLUTION_MODES) ?? "manual";
    const allowVoteChange = optionalBoolean(body, "allow_vote_change") ?? false;
    const doubleVoteEnabled = optionalBoolean(body, "double_vote_enabled") ?? true;
    // -1 is a sentinel: each player holds the double vote at most once per game, ever
    // -- see pickDoubleVoteHolder in _shared/db.ts.
    const doubleVoteFloorRounds = optionalIntInRangeOrSentinel(body, "double_vote_floor_rounds", 1, 20, -1) ?? 2;

    const db = sql();

    const result = await db.begin(async (tx) => {
      const [game] = await tx`
        insert into battle_royale.games
          (name, round_interval_minutes, missed_deadline_mode, round1_start_mode, round_resolution_mode,
           allow_vote_change, double_vote_enabled, double_vote_floor_rounds)
        values (
          ${name}, ${roundIntervalMinutes}, ${missedDeadlineMode}, ${round1StartMode},
          ${roundResolutionMode}, ${allowVoteChange}, ${doubleVoteEnabled}, ${doubleVoteFloorRounds}
        )
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

      if (botCount > 0) {
        await createBotPlayers(tx, game.id, botCount);
      }

      return { gameId: game.id as string, gmToken: gmInvite.token as string };
    });

    return jsonResponse({ game_id: result.gameId, gm_invite_token: result.gmToken }, 201);
  } catch (err) {
    return errorResponse(err);
  }
});
