// Invite tokens are the only credential in this app's auth model (see auth.ts) --
// centralized here so create-game and create-invite can't drift on token shape.
export function generateInviteToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}
