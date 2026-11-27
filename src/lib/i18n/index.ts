import { fr, type Dictionary } from "./fr";

export type Locale = "fr-CH"; // "de-CH" | "it-CH" later
const dictionaries: Record<Locale, Dictionary> = { "fr-CH": fr };

export const DEFAULT_LOCALE: Locale = "fr-CH";
export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return dictionaries[locale] ?? fr;
}
/** Shortcut used across the app until per-user locale switching ships. */
export const t = getDictionary();
