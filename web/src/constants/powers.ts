// Mirrors supabase/migrations/20260828124923_powers_catalogue.sql -- kept as a
// separate copy since the frontend needs this list before a game (and its
// game_power_settings rows) exists yet, during GM setup. Descriptions live in i18n
// under gmSetup.powers.catalogue.<key>.*, not here.
export type PowerCategory = "informational" | "defensive" | "offensive" | "chaos";

export interface PowerDef {
  key: string;
  category: PowerCategory;
}

export const POWERS_CATALOGUE: PowerDef[] = [
  { key: "rewind", category: "informational" },
  { key: "whisper", category: "informational" },
  { key: "watcher", category: "informational" },
  { key: "ward", category: "defensive" },
  { key: "deflect", category: "defensive" },
  { key: "null", category: "defensive" },
  { key: "second_voice", category: "offensive" },
  { key: "compel", category: "offensive" },
  { key: "silence", category: "offensive" },
  { key: "swap", category: "chaos" },
  { key: "false_flag", category: "chaos" },
];

export const ALL_POWER_KEYS = POWERS_CATALOGUE.map((p) => p.key);

// Mirrors the catalogue migration's default_enabled column -- every power is on by
// default except false_flag.
export const DEFAULT_ENABLED_POWER_KEYS = new Set(POWERS_CATALOGUE.filter((p) => p.key !== "false_flag").map((p) => p.key));

// GM setup screen groups the catalogue into two blocks purely for presentation, no
// separate backend concept: informational/defensive powers are things you privately
// know or use to protect yourself ("Powers"); offensive/chaos ones are things you
// actively deploy against other players ("Items"). Both still write to the same
// game_power_settings table.
export function powerSetupBlock(category: PowerCategory): "powers" | "items" {
  return category === "informational" || category === "defensive" ? "powers" : "items";
}
