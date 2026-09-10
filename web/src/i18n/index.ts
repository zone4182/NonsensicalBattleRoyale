import { createI18n } from "vue-i18n";
import en from "../locales/en.json";
import nl from "../locales/nl.json";

export const SUPPORTED_LOCALES = ["en", "nl"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const STORAGE_KEY = "nbr.locale";

function initialLocale(): SupportedLocale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) return stored as SupportedLocale;
  } catch {
    // localStorage unavailable (private mode, etc.) -- fall through to the default.
  }
  return "en";
}

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: "en",
  messages: { en, nl },
});

export function setLocale(locale: SupportedLocale): void {
  (i18n.global.locale as unknown as { value: SupportedLocale }).value = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Best-effort persistence only.
  }
}
