/**
 * Baki (বাকি) - i18n Helpers
 * Rule 10: Bangla-first UI with English fallback.
 * No hardcoded UI strings.
 */

import { bn, TranslationDictionary } from "./dictionaries/bn";
import { en } from "./dictionaries/en";

export type Locale = "bn" | "en";

const dictionaries: Record<Locale, TranslationDictionary> = {
  bn,
  en,
};

let currentLocale: Locale = "bn"; // Default to Bangla-first

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function getDictionary(locale: Locale = "bn"): TranslationDictionary {
  return dictionaries[locale] || dictionaries.bn;
}

/**
 * Access translation dictionary directly.
 * Defaults to Bangla with TypeScript type-safety.
 */
export const t = bn;
export { bn, en };
