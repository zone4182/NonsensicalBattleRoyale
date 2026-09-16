import { errorResponse, HttpError, jsonResponse, preflightResponse, readJsonBody } from "../_shared/http.ts";
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
import type {
  EndgameMode,
  MaxTiesBehavior,
  MissedDeadlineMode,
  Round1StartMode,
  RoundResolutionMode,
  TieBreakMode,
} from "../_shared/types.ts";

const MISSED_DEADLINE_MODES: readonly MissedDeadlineMode[] = ["forfeit_fatal", "no_consequence", "one_round_penalty"];
const ROUND1_START_MODES: readonly Round1StartMode[] = ["wait_for_all", "gm_manual", "scheduled"];
const ROUND_RESOLUTION_MODES: readonly RoundResolutionMode[] = ["automatic", "manual"];
const TIE_BREAK_MODES: readonly TieBreakMode[] = ["random", "no_elimination"];
const MAX_TIES_BEHAVIORS: readonly MaxTiesBehavior[] = ["coin_flip", "least_votes_dies"];
const ENDGAME_MODES: readonly EndgameMode[] = ["three_doors", "russian_roulette"];

function parseBooleanMap(body: Record<string, unknown>, field: string): Record<string, boolean> {
  const input = body[field];
  const result: Record<string, boolean> = {};
  if (input === undefined || input === null) return result;
  if (typeof input !== "object" || Array.isArray(input)) {
    throw new HttpError(400, "invalid_field", `'${field}' must be an object of power_key -> boolean.`);
  }
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value !== "boolean") {
      throw new HttpError(400, "invalid_field", `'${field}.${key}' must be a boolean.`);
    }
    result[key] = value;
  }
  return result;
}

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
    const tieBreakMode = optionalOneOf(body, "tie_break_mode", TIE_BREAK_MODES) ?? "random";
    // -1 disables the whole mechanic (default) -- only meaningful when tieBreakMode is
    // 'no_elimination', but harmless to store either way (resolve-round's tie branch
    // only ever reads it inside that mode).
    const maxConsecutiveTies = optionalIntInRangeOrSentinel(body, "max_consecutive_ties", 2, 50, -1) ?? -1;
    const maxTiesBehavior = optionalOneOf(body, "max_ties_behavior", MAX_TIES_BEHAVIORS) ?? "coin_flip";
    const moveToRoomEnabled = optionalBoolean(body, "move_to_room_enabled") ?? false;
    const threeDoorsDeadlineMinutes = optionalIntInRange(body, "three_doors_deadline_minutes", 1, 1440) ?? 10;
    const endgameMode = optionalOneOf(body, "endgame_mode", ENDGAME_MODES) ?? "three_doors";
    const endgameTransitionDeadlineMinutes = optionalIntInRange(body, "endgame_transition_deadline_minutes", 1, 1440) ?? 5;
    const rouletteTurnDeadlineMinutes = optionalIntInRange(body, "roulette_turn_deadline_minutes", 1, 1440) ?? 5;

    // GM-configurable per-power enable/disable, and per-power "can bots also get this"
    // (concept: powers_catalogue.default_enabled / game_power_settings.bot_eligible's
    // own default of true are only fallbacks now, not the final word). Keys not present
    // in either map just keep their default -- see the insert below.
    const powerOverrides = parseBooleanMap(body, "power_settings");
    const powerBotOverrides = parseBooleanMap(body, "power_bot_settings");

    const db = sql();

    const result = await db.begin(async (tx) => {
      const [game] = await tx`
        insert into battle_royale.games
          (name, round_interval_minutes, missed_deadline_mode, round1_start_mode, round_resolution_mode,
           allow_vote_change, double_vote_enabled, double_vote_floor_rounds, tie_break_mode, max_consecutive_ties,
           max_ties_behavior, move_to_room_enabled, three_doors_deadline_minutes, endgame_mode,
           endgame_transition_deadline_minutes, roulette_turn_deadline_minutes)
        values (
          ${name}, ${roundIntervalMinutes}, ${missedDeadlineMode}, ${round1StartMode},
          ${roundResolutionMode}, ${allowVoteChange}, ${doubleVoteEnabled}, ${doubleVoteFloorRounds}, ${tieBreakMode},
          ${maxConsecutiveTies}, ${maxTiesBehavior}, ${moveToRoomEnabled}, ${threeDoorsDeadlineMinutes}, ${endgameMode},
          ${endgameTransitionDeadlineMinutes}, ${rouletteTurnDeadlineMinutes}
        )
        returning id
      `;

      const gmToken = generateInviteToken();
      const [gmInvite] = await tx`
        insert into battle_royale.invites (game_id, token, display_name, role)
        values (${game.id}, ${gmToken}, ${gmDisplayName}, 'gm')
        returning id, token
      `;

      const catalogue = await tx<{ key: string; default_enabled: boolean }[]>`
        select key, default_enabled from battle_royale.powers_catalogue
      `;
      for (const power of catalogue) {
        const enabled = powerOverrides[power.key] ?? power.default_enabled;
        const botEligible = powerBotOverrides[power.key] ?? true;
        await tx`
          insert into battle_royale.game_power_settings (game_id, power_key, enabled, bot_eligible)
          values (${game.id}, ${power.key}, ${enabled}, ${botEligible})
        `;
      }

      if (botCount > 0) {
        await createBotPlayers(tx, game.id, botCount, moveToRoomEnabled);
      }

      return { gameId: game.id as string, gmToken: gmInvite.token as string };
    });

    return jsonResponse({ game_id: result.gameId, gm_invite_token: result.gmToken }, 201);
  } catch (err) {
    return errorResponse(err);
  }
});
