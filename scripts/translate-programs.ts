/**
 * Pre-generate form-schema translations into src/i18n/generated/programs.<locale>.json
 * so the live site never has to AI-translate the form at request time.
 *
 * Run after changing any form wording:
 *   npm run i18n:translate
 *
 * Reads AI_BASE_URL / AI_API_KEY / AI_MODEL from .env (loaded via --env-file).
 * Only translates strings not already present, so re-runs are cheap.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PROGRAMS } from "../src/lib/programs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "src", "i18n", "generated");

const LOCALES = ["fa", "ar", "fr", "es", "zh", "hi", "pa", "ur", "ru"] as const;
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

// ---- Collect every translatable English string from the schema --------------
function collectFromField(set: Set<string>, f: any) {
  if (f.label) set.add(f.label);
  if (f.placeholder) set.add(f.placeholder);
  if (f.help) set.add(f.help);
  if (f.itemLabel) set.add(f.itemLabel);
  f.options?.forEach((o: string) => set.add(o));
  f.fields?.forEach((sub: any) => collectFromField(set, sub));
}
function collectStrings(): string[] {
  const set = new Set<string>();
  for (const p of PROGRAMS as any[]) {
    set.add(p.name);
    set.add(p.tagline);
    set.add(p.blurb);
    for (const s of p.sections) {
      set.add(s.title);
      if (s.description) set.add(s.description);
      s.fields.forEach((f: any) => collectFromField(set, f));
    }
  }
  return [...set];
}

async function translateChunk(items: string[], locale: string): Promise<Record<string, string>> {
  const lang = LANG_NAMES[locale] ?? locale;
  const system =
    `You are a professional translator localizing a Canadian immigration application web portal into ${lang}. ` +
    `Translate each English UI string into natural, formal ${lang} suitable for an official government-style form. Rules:\n` +
    `- Keep acronyms/abbreviations in parentheses unchanged, e.g. (ECA), (CAD), (NOC), (IELTS), (CELPIP), (TEF), (TCF), (LMIA), (UCI), (FSWP), (CEC), (FSTP), (PNP).\n` +
    `- Keep organization names and proper nouns as-is (e.g. World Education Services, IRCC).\n` +
    `- Preserve meaning precisely; do not add commentary.\n` +
    `- Return exactly one translation per input string, in the same order.`;
  const user =
    `Translate these ${items.length} strings into ${lang}. ` +
    `Respond with JSON only: {"translations": ["...", ...]} containing exactly ${items.length} items in the same order as the input.\n\nINPUT:\n${JSON.stringify(items)}`;

  const res = await fetch(`${process.env.AI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`AI HTTP ${res.status}: ${await res.text().catch(() => "")}`);
  const json: any = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);
  const arr: string[] = parsed.translations || [];
  const out: Record<string, string> = {};
  items.forEach((s, i) => {
    if (typeof arr[i] === "string" && arr[i].trim()) out[s] = arr[i].trim();
  });
  return out;
}

async function main() {
  if (!process.env.AI_API_KEY || !process.env.AI_BASE_URL || !process.env.AI_MODEL) {
    throw new Error("Missing AI_BASE_URL / AI_API_KEY / AI_MODEL. Run with: npm run i18n:translate (loads .env)");
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const strings = collectStrings();
  console.log(`Form has ${strings.length} translatable strings.`);

  for (const locale of LOCALES) {
    const file = path.join(OUT_DIR, `programs.${locale}.json`);
    let map: Record<string, string> = {};
    try {
      map = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      map = {};
    }
    // Drop stale keys no longer in the schema, keep current ones.
    const current: Record<string, string> = {};
    for (const s of strings) if (map[s]) current[s] = map[s];
    const missing = strings.filter((s) => !current[s]);

    if (missing.length === 0) {
      console.log(`[${locale}] up to date (${strings.length} strings).`);
      fs.writeFileSync(file, JSON.stringify(sortKeys(current), null, 2) + "\n");
      continue;
    }
    console.log(`[${locale}] translating ${missing.length} new string(s)…`);
    const CHUNK = 40;
    for (let i = 0; i < missing.length; i += CHUNK) {
      const chunk = missing.slice(i, i + CHUNK);
      try {
        const translated = await translateChunk(chunk, locale);
        Object.assign(current, translated);
        process.stdout.write(`  ${Math.min(i + CHUNK, missing.length)}/${missing.length}\r`);
      } catch (e: any) {
        console.error(`\n  chunk failed: ${e.message}`);
      }
    }
    fs.writeFileSync(file, JSON.stringify(sortKeys(current), null, 2) + "\n");
    console.log(`\n[${locale}] wrote ${Object.keys(current).length} strings.`);
  }
  console.log("Done. Commit src/i18n/generated/*.json and deploy.");
}

function sortKeys(o: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
