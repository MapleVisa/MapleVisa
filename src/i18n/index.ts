import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import en, { type Dictionary } from "./dictionaries/en";
import { loadDictionary } from "./load";

export async function getLocale(): Promise<Locale> {
  const c = cookies().get(LOCALE_COOKIE)?.value;
  return isLocale(c) ? c : DEFAULT_LOCALE;
}

export async function getDictionary(locale?: Locale): Promise<Dictionary> {
  const loc = locale ?? (await getLocale());
  return loadDictionary(loc);
}

export { en };
export type { Dictionary };
