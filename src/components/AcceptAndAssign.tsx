"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Lawyer = { id: string; fullName: string; email: string; activeCases: number };

export type Readiness = {
  validationOk: boolean;
  docsTotal: number;
  docsDone: number;
  docsRejected: number;
  ready: boolean;
};

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span className={ok ? "text-emerald-600" : "text-amber-600"}>{ok ? "✓" : "•"}</span>
      <span className={ok ? "text-ink-600" : "text-amber-700"}>{children}</span>
    </li>
  );
}

/**
 * Admin-only flow: confirm the application is complete and AI-checked, accept it
 * (→ VALIDATED), then assign it to a chosen available lawyer (→ WITH_LAWYER).
 */
export default function AcceptAndAssign({
  id,
  status,
  readiness,
}: {
  id: string;
  status: string;
  readiness: Readiness;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lawyers, setLawyers] = useState<Lawyer[] | null>(null);
  const [lawyerId, setLawyerId] = useState("");

  const preAccept = ["SUBMITTED", "UNDER_REVIEW", "NEEDS_INFO"].includes(status);
  const readyToAssign = status === "VALIDATED";

  useEffect(() => {
    if (!readyToAssign) return;
    fetch("/api/admin/lawyers")
      .then((r) => r.json())
      .then((j) => {
        const list: Lawyer[] = j.lawyers || [];
        setLawyers(list);
        if (list.length) setLawyerId(list.slice().sort((a, b) => a.activeCases - b.activeCases)[0].id);
      })
      .catch(() => setLawyers([]));
  }, [readyToAssign]);

  async function patch(payload: Record<string, any>) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Action failed.");
      return;
    }
    router.refresh();
  }

  if (!preAccept && !readyToAssign) return null;

  return (
    <div className="card p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">
        Accept &amp; assign
      </h3>
      {error && <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{error}</p>}

      {preAccept && (
        <>
          <ul className="mt-4 space-y-2">
            <Check ok={readiness.validationOk}>
              {readiness.validationOk
                ? "All required fields complete"
                : "Some required fields are still missing"}
            </Check>
            <Check ok={readiness.docsTotal > 0 && readiness.docsDone === readiness.docsTotal}>
              {readiness.docsTotal === 0
                ? "No documents uploaded yet"
                : `Document AI check: ${readiness.docsDone}/${readiness.docsTotal} done`}
            </Check>
            <Check ok={readiness.docsRejected === 0}>
              {readiness.docsRejected === 0
                ? "No documents flagged for rejection by AI"
                : `${readiness.docsRejected} document(s) flagged by AI`}
            </Check>
          </ul>
          <button
            onClick={() =>
              patch({
                status: "VALIDATED",
                reviewNote: "AI review confirmed and application accepted.",
              })
            }
            disabled={busy || !readiness.ready}
            className="btn-primary mt-4 w-full disabled:opacity-50"
          >
            {busy ? "Working…" : "✓ Confirm AI review & accept"}
          </button>
          {!readiness.ready && (
            <p className="mt-2 text-xs text-ink-400">
              Available once the application is complete and every document has been AI-checked
              without rejections.
            </p>
          )}
        </>
      )}

      {readyToAssign && (
        <>
          <p className="mt-3 text-sm text-ink-500">
            Application accepted. Assign it to an available lawyer to start processing.
          </p>
          <div className="mt-4">
            <label className="label">Lawyer</label>
            {lawyers === null ? (
              <p className="text-sm text-ink-400">Loading lawyers…</p>
            ) : lawyers.length === 0 ? (
              <p className="text-sm text-amber-700">No lawyers available. Add a lawyer account first.</p>
            ) : (
              <select className="input" value={lawyerId} onChange={(e) => setLawyerId(e.target.value)}>
                {lawyers.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.fullName} — {l.activeCases} active case{l.activeCases === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            )}
          </div>
          <button
            onClick={() => patch({ lawyerId, status: "WITH_LAWYER" })}
            disabled={busy || !lawyerId}
            className="btn-primary mt-3 w-full disabled:opacity-50"
          >
            {busy ? "Assigning…" : "⚖️ Assign to lawyer"}
          </button>
        </>
      )}
    </div>
  );
}
