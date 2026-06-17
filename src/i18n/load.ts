// Dictionary loader with deep-merge fallback to English.
// Safe to import from both server and client code (no server-only deps).
import { type Locale } from "./config";
import en, { type Dictionary } from "./dictionaries/en";
import fa from "./dictionaries/fa";
import ar from "./dictionaries/ar";
import fr from "./dictionaries/fr";
import es from "./dictionaries/es";
import zh from "./dictionaries/zh";
import hi from "./dictionaries/hi";
import pa from "./dictionaries/pa";
import ur from "./dictionaries/ur";
import ru from "./dictionaries/ru";

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

const OVERRIDES: Record<Locale, DeepPartial<Dictionary>> = {
  en,
  fa,
  ar,
  fr,
  es,
  zh,
  hi,
  pa,
  ur,
  ru,
};

function deepMerge<T>(base: T, override: DeepPartial<T>): T {
  if (override == null) return base;
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...base };
  for (const key of Object.keys(override) as (keyof T)[]) {
    const ov = (override as any)[key];
    const bv = (base as any)[key];
    if (ov && typeof ov === "object" && !Array.isArray(ov) && bv && typeof bv === "object") {
      out[key] = deepMerge(bv, ov);
    } else if (ov !== undefined) {
      out[key] = ov;
    }
  }
  return out as T;
}

const cache = new Map<Locale, Dictionary>();

export function loadDictionary(locale: Locale): Dictionary {
  if (cache.has(locale)) return cache.get(locale)!;
  const merged = locale === "en" ? en : deepMerge(en, OVERRIDES[locale] || {});
  cache.set(locale, merged);
  return merged;
}

// Simple {placeholder} interpolation helper.
export function fmt(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}
