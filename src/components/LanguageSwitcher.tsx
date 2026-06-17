"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { LOCALES, LOCALE_META, type Locale } from "@/i18n/config";
import { useIntl } from "@/i18n/IntlProvider";

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { locale } = useIntl();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function choose(loc: Locale) {
    setOpen(false);
    if (loc === locale) return;
    setBusy(true);
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: loc }),
    });
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        className="btn-ghost gap-1.5 px-2.5"
        aria-label="Change language"
      >
        <span className="text-base">{LOCALE_META[locale].flag}</span>
        {!compact && <span>{LOCALE_META[locale].label}</span>}
        <span className="text-xs text-ink-400">▾</span>
      </button>
      {open && (
        <div className="absolute end-0 z-50 mt-1 max-h-80 w-44 overflow-auto rounded-xl border border-ink-200 bg-white p-1 shadow-card">
          {LOCALES.map((loc) => (
            <button
              key={loc}
              onClick={() => choose(loc)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-start text-sm transition ${
                loc === locale ? "bg-brand-50 font-semibold text-brand-700" : "text-ink-700 hover:bg-ink-50"
              }`}
            >
              <span className="text-base">{LOCALE_META[loc].flag}</span>
              <span>{LOCALE_META[loc].label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
