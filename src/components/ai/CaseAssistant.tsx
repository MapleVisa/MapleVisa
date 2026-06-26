"use client";

import { useEffect, useState } from "react";
import { useT } from "@/i18n/IntlProvider";

type Summary = {
  summary: string;
  strengths?: string[];
  concerns?: string[];
  inconsistencies?: string[];
  documentsSummary?: string;
  suggestedNote?: string;
};

export default function CaseAssistant({ applicationId }: { applicationId: string }) {
  const t = useT();
  const [result, setResult] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();

  // Recall a previously generated summary for this case, if any.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await fetch(
        `/api/ai/conversations?kind=case&applicationId=${applicationId}`
      ).then((r) => r.json()).catch(() => null);
      const latest = list?.conversations?.[0];
      if (!latest || cancelled) return;
      const full = await fetch(`/api/ai/conversations/${latest.id}`)
        .then((r) => r.json())
        .catch(() => null);
      const content = full?.conversation?.messages?.[0]?.content;
      if (content && !cancelled) {
        try {
          setResult(JSON.parse(content));
          setConversationId(latest.id);
        } catch {
          /* ignore malformed */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  async function generate() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/ai/case-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, conversationId }),
    });
    setBusy(false);
    if (res.status === 503) {
      setError(t.ai.notConfigured);
      return;
    }
    const json = await res.json().catch(() => ({}));
    if (json.result) {
      setResult(json.result);
      if (json.conversationId) setConversationId(json.conversationId);
    } else setError(json.error || "AI error");
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">
          {t.ai.caseSummary}
        </h3>
        {result && (
          <button onClick={generate} disabled={busy} className="btn-ghost px-2 py-1 text-xs">
            {t.ai.regenerate}
          </button>
        )}
      </div>

      {error && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p>}

      {!result ? (
        <button onClick={generate} disabled={busy} className="btn-secondary mt-3 w-full gap-2">
          <span>✨</span> {busy ? t.ai.thinking : t.ai.generateSummary}
        </button>
      ) : (
        <div className="mt-3 space-y-3 text-sm">
          <p className="text-ink-700">{result.summary}</p>

          {result.inconsistencies && result.inconsistencies.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-red-600">⚠️ Inconsistencies</p>
              <ul className="mt-1 list-inside list-disc text-ink-600">
                {result.inconsistencies.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          )}
          {result.concerns && result.concerns.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-amber-600">Concerns</p>
              <ul className="mt-1 list-inside list-disc text-ink-600">
                {result.concerns.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          )}
          {result.strengths && result.strengths.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-600">Strengths</p>
              <ul className="mt-1 list-inside list-disc text-ink-600">
                {result.strengths.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          )}
          {result.documentsSummary && (
            <div>
              <p className="text-xs font-semibold uppercase text-violet-600">📄 Documents</p>
              <p className="mt-1 text-ink-600">{result.documentsSummary}</p>
            </div>
          )}
          {result.suggestedNote && (
            <div className="rounded-lg border border-ink-200 bg-ink-50 p-3">
              <p className="text-xs font-semibold text-ink-500">Suggested note to applicant</p>
              <p className="mt-1 text-ink-700">{result.suggestedNote}</p>
            </div>
          )}
          <p className="text-[11px] text-ink-400">{t.ai.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
