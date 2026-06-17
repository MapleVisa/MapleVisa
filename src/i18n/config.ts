// Internationalization configuration.
// The AI chatbot replies in any language the user writes; this list controls
// the translated website chrome (navigation, buttons, headings, etc.).

export const LOCALES = [
  "en",
  "fa",
  "ar",
  "fr",
  "es",
  "zh",
  "hi",
  "pa",
  "ur",
  "ru",
] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "mv_locale";

// Native display names + text direction.
export const LOCALE_META: Record<Locale, { label: string; dir: "ltr" | "rtl"; flag: string }> = {
  en: { label: "English", dir: "ltr", flag: "🇬🇧" },
  fa: { label: "فارسی", dir: "rtl", flag: "🇮🇷" },
  ar: { label: "العربية", dir: "rtl", flag: "🇸🇦" },
  fr: { label: "Français", dir: "ltr", flag: "🇫🇷" },
  es: { label: "Español", dir: "ltr", flag: "🇪🇸" },
  zh: { label: "中文", dir: "ltr", flag: "🇨🇳" },
  hi: { label: "हिन्दी", dir: "ltr", flag: "🇮🇳" },
  pa: { label: "ਪੰਜਾਬੀ", dir: "ltr", flag: "🇮🇳" },
  ur: { label: "اردو", dir: "rtl", flag: "🇵🇰" },
  ru: { label: "Русский", dir: "ltr", flag: "🇷🇺" },
};

// English names of each locale's language, for instructing the AI which
// language to write in. Shared by the form localizer and the AI prompts.
export const LANGUAGE_NAMES: Record<Locale, string> = {
  en: "English",
  fa: "Persian (Farsi)",
  ar: "Arabic",
  fr: "French",
  es: "Spanish",
  zh: "Simplified Chinese",
  hi: "Hindi",
  pa: "Punjabi (Gurmukhi script)",
  ur: "Urdu",
  ru: "Russian",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function dirFor(locale: Locale): "ltr" | "rtl" {
  return LOCALE_META[locale].dir;
}
