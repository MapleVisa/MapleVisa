import {
  GB, IR, SA, FR, ES, CN, IN, PK, RU,
} from "country-flag-icons/react/3x2";
import type { Locale } from "@/i18n/config";

// Map each locale to a country flag. Rendered as inline SVG so it displays on
// every platform (Windows desktop browsers do not render emoji flags).
const FLAG: Record<Locale, React.ComponentType<{ className?: string; title?: string }>> = {
  en: GB,
  fa: IR,
  ar: SA,
  fr: FR,
  es: ES,
  zh: CN,
  hi: IN,
  pa: IN,
  ur: PK,
  ru: RU,
};

export default function Flag({ locale, className = "h-4 w-6 rounded-sm" }: { locale: Locale; className?: string }) {
  const Cmp = FLAG[locale];
  return <Cmp className={className} title={locale} />;
}
