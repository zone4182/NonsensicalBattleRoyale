// Invite tokens are only ever shown once, at creation (list-invites deliberately never
// re-exposes them). The setup wizard creates every drafted invite as its very last
// step, right before forwarding to the management hub -- this is how it hands those
// one-time tokens to GmInPlayView's first render without a dedicated Pinia store for
// something this transient. sessionStorage (not localStorage) so it doesn't linger
// past this browser tab/session, and the reader is expected to remove the key once
// it's displayed the contents.
export const JUST_CREATED_INVITES_KEY = "nbr.justCreatedInvites";

export interface JustCreatedInvite {
  display_name: string;
  token: string;
}

export function takeJustCreatedInvites(): JustCreatedInvite[] {
  const raw = sessionStorage.getItem(JUST_CREATED_INVITES_KEY);
  if (!raw) return [];
  sessionStorage.removeItem(JUST_CREATED_INVITES_KEY);
  try {
    return JSON.parse(raw) as JustCreatedInvite[];
  } catch {
    return [];
  }
}
