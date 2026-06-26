"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/i18n/IntlProvider";

type ProgramCard = {
  code: string;
  name: string;
  tagline: string;
  blurb: string;
  icon: string;
  estMinutes: number;
  sections: number;
};

export default function ProgramPicker({
  programs,
  draftPrograms = [],
}: {
  programs: ProgramCard[];
  draftPrograms?: string[];
}) {
  const router = useRouter();
  const t = useT();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasDuplicateDraft = !!selected && draftPrograms.includes(selected);

  async function start() {
    if (!selected) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ program: selected }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || "Could not start application.");
      setLoading(false);
      return;
    }
    router.push(`/apply/${json.id}`);
  }

  return (
    <div className="mt-10">
      <div className="grid gap-5 sm:grid-cols-2">
        {programs.map((p) => {
          const active = selected === p.code;
          return (
            <button
              key={p.code}
              type="button"
              onClick={() => setSelected(p.code)}
              className={`card flex flex-col p-6 text-left transition ${
                active
                  ? "ring-2 ring-brand-500 ring-offset-2"
                  : "hover:shadow-card hover:ring-1 hover:ring-ink-200"
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-3xl">{p.icon}</span>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                    active ? "border-brand-500 bg-brand-500 text-white" : "border-ink-300"
                  }`}
                >
                  {active ? "✓" : ""}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-bold text-ink-900">{p.name}</h3>
              <p className="mt-0.5 text-sm font-medium text-brand-600">{p.tagline}</p>
              <p className="mt-3 flex-1 text-sm text-ink-600">{p.blurb}</p>
              <div className="mt-4 flex gap-3 text-xs text-ink-400">
                <span>≈ {p.estMinutes} {t.landing.minToComplete}</span>
                <span>·</span>
                <span>{p.sections} {t.apply.sections}</span>
              </div>
            </button>
          );
        })}
      </div>

      {hasDuplicateDraft && (
        <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">⚠️ You already have a draft for this program.</span>{" "}
          You can still start another, but you may want to continue your existing draft from your
          dashboard instead of creating a duplicate.
        </div>
      )}

      {error && <p className="mt-4 text-center text-sm text-brand-600">{error}</p>}

      <div className="mt-8 flex justify-center">
        <button
          onClick={start}
          disabled={!selected || loading}
          className="btn-primary px-8 py-3 text-base"
        >
          {loading
            ? t.common.loading
            : hasDuplicateDraft
            ? "Start another anyway"
            : t.common.continue}
        </button>
      </div>
    </div>
  );
}
