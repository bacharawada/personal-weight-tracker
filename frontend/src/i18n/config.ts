/**
 * i18n configuration — supported languages, persistence, and detection.
 *
 * Language codes are declared as an `as const` tuple (no TS enums, per the
 * project's `erasableSyntaxOnly` setting) so the `Language` union stays in
 * sync with the runtime list.
 */

export const LANGUAGES = ["en", "fr"] as const;

export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "en";

/** localStorage key holding the user's explicit language choice. */
export const LANGUAGE_STORAGE_KEY = "lang";

/** Native display name shown in the language switcher. */
export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  fr: "Français",
};

/** Narrow an arbitrary value to a supported `Language`. */
export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

/**
 * Resolve the language to start with: an explicit stored choice wins, then the
 * browser's preferred language (matched on the two-letter primary subtag),
 * falling back to the default.
 */
export function resolveInitialLanguage(): Language {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (isLanguage(stored)) return stored;

  const browser = navigator.language.slice(0, 2).toLowerCase();
  if (isLanguage(browser)) return browser;

  return DEFAULT_LANGUAGE;
}
