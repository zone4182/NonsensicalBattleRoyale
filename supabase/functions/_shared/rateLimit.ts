import { sql } from "./db.ts";
import { HttpError } from "./http.ts";

// Client IP as seen by Supabase's edge -- x-forwarded-for's first entry is the
// original client (Supabase/Deno Deploy appends proxy hops after it). Falls back to
// "unknown" rather than throwing, so a missing header degrades to one shared bucket
// instead of breaking the endpoint entirely.
export function clientIdentifier(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// Counts every call (success or failure) against the identifier within the window,
// not just failed ones -- for a brute-force target like a shared secret or a token
// guess, that's the property that actually matters: an attacker gets at most
// `maxAttempts` guesses per window, full stop, regardless of what any individual
// guess returns. Records the attempt and prunes this scope+identifier's own old rows
// in the same round trip, so no separate cleanup job is needed.
export async function enforceRateLimit(
  req: Request,
  scope: string,
  maxAttempts: number,
  windowMinutes: number,
): Promise<void> {
  const identifier = clientIdentifier(req);
  const db = sql();

  const [{ count }] = await db<{ count: number }[]>`
    select count(*)::int as count from battle_royale.rate_limit_attempts
    where scope = ${scope} and identifier = ${identifier}
      and created_at > now() - (${windowMinutes} || ' minutes')::interval
  `;
  if (count >= maxAttempts) {
    throw new HttpError(429, "rate_limited", `Too many attempts -- try again in a bit.`);
  }

  await db`insert into battle_royale.rate_limit_attempts (scope, identifier) values (${scope}, ${identifier})`;
  await db`
    delete from battle_royale.rate_limit_attempts
    where scope = ${scope} and identifier = ${identifier} and created_at <= now() - (${windowMinutes} || ' minutes')::interval
  `;
}
