import webpush from "npm:web-push@3.6.7";
import { sql } from "./db.ts";
import type { PushSubscriptionRow } from "./types.ts";

// Web Push (VAPID) -- see ARCHITECTURE.md "Notifications". Configured lazily (not at
// module load) so a function that never sends push doesn't fail to boot just because
// the VAPID secrets haven't been set yet; sendPushToPlayers itself no-ops with a
// console warning if they're missing, rather than throwing and taking down whatever
// game-state change triggered it (a round starting, resolving, etc. must never fail
// because a notification couldn't be sent).
let vapidReady = false;

function ensureVapidConfigured(): boolean {
  if (vapidReady) return true;
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT");
  if (!publicKey || !privateKey || !subject) {
    console.warn("[push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT not fully configured -- skipping push send.");
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidReady = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

// Fire-and-forget towards every subscription belonging to the given players (a player
// can have more than one, e.g. phone + laptop). A subscription the push service
// reports as gone (404/410 -- uninstalled, permissions revoked, browser data cleared)
// is deleted so it stops being retried forever; any other failure is logged and
// otherwise swallowed, since a notification failing to send must never fail the
// caller's own request/transaction.
export async function sendPushToPlayers(playerIds: string[], payload: PushPayload): Promise<void> {
  if (playerIds.length === 0) return;
  if (!ensureVapidConfigured()) return;

  const db = sql();
  const subs = await db<PushSubscriptionRow[]>`
    select * from battle_royale.push_subscriptions where player_id in ${db(playerIds)}
  `;
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body);
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await db`delete from battle_royale.push_subscriptions where id = ${sub.id}`;
        } else {
          console.error(`[push] failed to send to subscription ${sub.id}:`, err);
        }
      }
    }),
  );
}
