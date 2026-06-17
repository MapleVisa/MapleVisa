import "server-only";
import fs from "fs";
import path from "path";
import { PROGRAMS, getProgram, type Program, type Section, type Field } from "@/lib/programs";
import { getAI, parseJsonLoose } from "@/lib/ai";
import type { Locale } from "@/i18n/config";

// =============================================================================
// Form schema localization.
// programs.ts stays the English source of truth (used by validation + AI
// prompts). Here we translate only the *display* strings (titles, labels,
// options, help, placeholders, program names) into the user's language via the
// configured AI provider, cached to disk so each language is translated once.
// Option *values* stay English; we add `optionLabels` for display only.
// =============================================================================

const LANG_NAMES: Record<string, string> = {
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

type StringMap = Record<string, string>;

const memo = new Map<Locale, StringMap>();
const inflight = new Map<Locale, Promise<StringMap>>();

// ---- Collect every translatable English string from the schema --------------

function collectFromField(set: Set<string>, f: Field) {
  if (f.label) set.add(f.label);
  if (f.placeholder) set.add(f.placeholder);
  if (f.help) set.add(f.help);
  if (f.itemLabel) set.add(f.itemLabel);
  f.options?.forEach((o) => set.add(o));
  f.fields?.forEach((sub) => collectFromField(set, sub));
}

function collectStrings(): string[] {
  const set = new Set<string>();
  for (const p of PROGRAMS) {
    set.add(p.name);
    set.add(p.tagline);
    set.add(p.blurb);
    for (const s of p.sections) {
      set.add(s.title);
      if (s.description) set.add(s.description);
      s.fields.forEach((f) => collectFromField(set, f));
    }
  }
  return [...set];
}

// ---- Disk cache -------------------------------------------------------------

function cacheFile(locale: Locale) {
  return path.join(process.cwd(), ".cache", "i18n", `programs.${locale}.json`);
}

function readCache(locale: Locale): StringMap {
  try {
    const raw = fs.readFileSync(cacheFile(locale), "utf8");
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function writeCache(locale: Locale, map: StringMap) {
  try {
    const file = cacheFile(locale);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(map, null, 2), "utf8");
  } catch {
    // Read-only FS (e.g. some deploys): in-memory cache still applies.
  }
}

// ---- AI translation ---------------------------------------------------------

async function translateChunk(items: string[], locale: Locale): Promise<StringMap> {
  const lang = LANG_NAMES[locale] ?? locale;
  const system =
    `You are a professional translator localizing a Canadian immigration application ` +
    `web portal into ${lang}. Translate each English UI string into natural, formal ${lang} ` +
    `suitable for an official government-style form. Rules:\n` +
    `- Keep acronyms/abbreviations in parentheses unchanged, e.g. (ECA), (CAD), (NOC), ` +
    `(IELTS), (CELPIP), (TEF), (TCF), (LMIA), (UCI), (FSWP), (CEC), (FSTP), (PNP), (NOC).\n` +
    `- Keep organization names and proper nouns as-is (e.g. World Education Services, IRCC).\n` +
    `- In examples like "e.g. B.Sc. Computer Science", translate "e.g." naturally but keep the example text.\n` +
    `- Preserve meaning precisely; do not add commentary.\n` +
    `- Return exactly one translation per input string, in the same order.`;
  const user =
    `Translate these ${items.length} strings into ${lang}. ` +
    `Respond with JSON only: {"translations": ["...", ...]} containing exactly ${items.length} ` +
    `items in the same order as the input.\n\nINPUT:\n${JSON.stringify(items)}`;

  const out = await getAI().chat({
    system,
    messages: [{ role: "user", content: user }],
    json: true,
    temperature: 0,
  });

  const parsed = parseJsonLoose<{ translations: string[] }>(out);
  const arr = parsed?.translations;
  const result: StringMap = {};
  if (Array.isArray(arr)) {
    items.forEach((s, i) => {
      const t = arr[i];
      if (typeof t === "string" && t.trim()) result[s] = t.trim();
    });
  }
  return result;
}

async function buildMap(locale: Locale): Promise<StringMap> {
  const strings = collectStrings();
  let map = readCache(locale);
  const missing = strings.filter((s) => !(s in map));

  if (missing.length && getAI().isConfigured()) {
    const CHUNK = 50;
    for (let i = 0; i < missing.length; i += CHUNK) {
      const chunk = missing.slice(i, i + CHUNK);
      try {
        const translated = await translateChunk(chunk, locale);
        map = { ...map, ...translated };
      } catch {
        // Skip this chunk on failure; untranslated strings fall back to English.
      }
    }
    writeCache(locale, map);
  }
  return map;
}

async function getMap(locale: Locale): Promise<StringMap> {
  if (memo.has(locale)) return memo.get(locale)!;
  if (inflight.has(locale)) return inflight.get(locale)!;
  const p = buildMap(locale);
  inflight.set(locale, p);
  try {
    const map = await p;
    memo.set(locale, map);
    return map;
  } finally {
    inflight.delete(locale);
  }
}

// ---- Apply the map ----------------------------------------------------------

function tr(map: StringMap, s: string): string {
  return map[s] ?? s;
}

function localizeField(map: StringMap, f: Field): Field {
  return {
    ...f,
    label: tr(map, f.label),
    placeholder: f.placeholder ? tr(map, f.placeholder) : f.placeholder,
    help: f.help ? tr(map, f.help) : f.help,
    itemLabel: f.itemLabel ? tr(map, f.itemLabel) : f.itemLabel,
    optionLabels: f.options ? f.options.map((o) => tr(map, o)) : undefined,
    fields: f.fields ? f.fields.map((sub) => localizeField(map, sub)) : undefined,
  };
}

function applyMap(base: Program, map: StringMap): Program {
  return {
    ...base,
    name: tr(map, base.name),
    tagline: tr(map, base.tagline),
    blurb: tr(map, base.blurb),
    sections: base.sections.map<Section>((s) => ({
      ...s,
      title: tr(map, s.title),
      description: s.description ? tr(map, s.description) : s.description,
      fields: s.fields.map((f) => localizeField(map, f)),
    })),
  };
}

// ---- Public API -------------------------------------------------------------

/** Localized copy of a single program (by code) for the given locale. */
export async function localizeProgram(code: string, locale: Locale): Promise<Program | undefined> {
  const base = getProgram(code);
  if (!base || locale === "en") return base;
  const map = await getMap(locale);
  return applyMap(base, map);
}

/** Localized copies of all programs (for the picker / landing cards). */
export async function localizePrograms(locale: Locale): Promise<Program[]> {
  if (locale === "en") return PROGRAMS;
  const map = await getMap(locale);
  return PROGRAMS.map((p) => applyMap(p, map));
}

/** Localized program display names keyed by code (for tables/lists). */
export async function localizeProgramNames(locale: Locale): Promise<Record<string, string>> {
  if (locale === "en") return Object.fromEntries(PROGRAMS.map((p) => [p.code, p.name]));
  const map = await getMap(locale);
  return Object.fromEntries(PROGRAMS.map((p) => [p.code, tr(map, p.name)]));
}

/** Translate arbitrary schema-derived strings (e.g. validation messages). */
export async function localizeStrings(strings: string[], locale: Locale): Promise<string[]> {
  if (locale === "en") return strings;
  const map = await getMap(locale);
  return strings.map((s) => tr(map, s));
}
