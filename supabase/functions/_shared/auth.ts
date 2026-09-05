import { sql } from "./db.ts";
import { HttpError } from "./http.ts";
import type { Game, Invite, Player, PlayerRole } from "./types.ts";

export interface AuthContext {
  invite: Invite;
  player: Player;
  game: Game;
  role: PlayerRole;
}

function extractBearerToken(req: Request): string {
  const header = req.headers.get("Authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new HttpError(401, "missing_token", "Authorization: Bearer <token> header is required.");
  return match[1].trim();
}

// A player's invite token is their identity for that game -- there is no Supabase Auth
// involved (ARCHITECTURE.md "Auth/identity"). The Human GM uses this same model.
export async function authenticate(req: Request): Promise<AuthContext> {
  const token = extractBearerToken(req);

  const invites = await sql()<Invite[]>`
    select * from battle_royale.invites where token = ${token}
  `;
  const invite = invites[0];
  if (!invite || !invite.redeemed_at) {
    throw new HttpError(401, "invalid_or_unredeemed_token", "This invite token is invalid or has not been redeemed.");
  }

  const players = await sql()<Player[]>`
    select * from battle_royale.players where invite_id = ${invite.id}
  `;
  const player = players[0];
  if (!player) {
    throw new HttpError(401, "no_player_for_invite", "No player record exists for this invite.");
  }

  const games = await sql()<Game[]>`
    select * from battle_royale.games where id = ${player.game_id}
  `;
  const game = games[0];
  if (!game) {
    throw new HttpError(404, "game_not_found", "The game for this player no longer exists.");
  }

  return { invite, player, game, role: player.role };
}

export function requireRole(ctx: AuthContext, role: PlayerRole): void {
  if (ctx.role !== role) {
    throw new HttpError(403, "forbidden_role", `This action requires the '${role}' role.`);
  }
}

export function requireAlive(ctx: AuthContext): void {
  if (ctx.player.status !== "alive") {
    throw new HttpError(403, "not_alive", "Ghosts cannot perform this action.");
  }
}

// Scheduled functions (resolve-round, resolve-doors, send-notifications) are invoked by
// Supabase's cron infra, not a player bearer token -- gated by a shared secret instead.
export function requireCronSecret(req: Request): void {
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected) throw new HttpError(500, "cron_secret_not_configured", "CRON_SECRET is not set.");
  const provided = req.headers.get("x-cron-secret");
  if (provided !== expected) {
    throw new HttpError(401, "invalid_cron_secret", "Missing or invalid x-cron-secret header.");
  }
}

// create-game is the one function with no invite token yet -- gated by a separate
// shared setup secret instead (confirmed with the user).
export function requireSetupSecret(req: Request): void {
  const expected = Deno.env.get("SETUP_SECRET");
  if (!expected) throw new HttpError(500, "setup_secret_not_configured", "SETUP_SECRET is not set.");
  const provided = req.headers.get("x-setup-secret");
  if (provided !== expected) {
    throw new HttpError(401, "invalid_setup_secret", "Missing or invalid x-setup-secret header.");
  }
}

// resolve-round is invoked either by cron (shared secret, unscoped or body-scoped) or
// by a GM clicking "Resolve now" locally where there's no working cron (their own
// invite-token bearer, hard-scoped to their own game -- this keeps CRON_SECRET out of
// the frontend bundle entirely). Returns the game id to scope the caller to, or null
// for an unscoped cron sweep across all games.
export async function requireCronOrGmForGame(req: Request, bodyGameId?: string): Promise<string | null> {
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret) {
    requireCronSecret(req);
    return bodyGameId ?? null;
  }
  const ctx = await authenticate(req);
  requireRole(ctx, "gm");
  return ctx.game.id;
}
