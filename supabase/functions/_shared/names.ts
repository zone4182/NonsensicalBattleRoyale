// The invite's display_name (set by the GM) is never shown to other players once a
// chosen_display_name exists -- publicName is what everyone but the GM sees (roster,
// narration, a player's own status). gmName is GM-only: the invite name always leads,
// with the player's own chosen name in parentheses when they set one, so the GM never
// loses track of who someone originally was invited as.

export function publicName(inviteName: string, chosenName: string | null | undefined): string {
  return chosenName ?? inviteName;
}

export function gmName(inviteName: string, chosenName: string | null | undefined): string {
  return chosenName ? `${inviteName} (${chosenName})` : inviteName;
}
