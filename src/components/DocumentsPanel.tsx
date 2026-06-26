"use client";

import { useEffect, useRef, useState } from "react";
import { useT, fmt } from "@/i18n/IntlProvider";
import { DOCUMENT_CATEGORIES } from "@/lib/documents";
import PrettySelect from "./PrettySelect";

type Doc = {
  id: string;
  category: string;
  originalName: string;
  mimeType: string;
  size: number;
  aiStatus: string;
  aiVerdict: string | null;
  aiResult: string | null;
  reviewStatus: string;
  reviewNote: string | null;
  createdAt: string;
};

const VERDICT_STYLE: Record<string, string> = {
  ok: "bg-emerald-100 text-emerald-700",
  attention: "bg-amber-100 text-amber-700",
  reject: "bg-red-100 text-red-700",
};
const REVIEW_STYLE: Record<string, string> = {
  PENDING: "bg-ink-100 text-ink-600",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function DocumentsPanel({
  applicationId,
  canUpload,
  isStaff,
  maxMb,
}: {
  applicationId: string;
  canUpload: boolean;
  isStaff: boolean;
  maxMb: number;
}) {
  const t = useT();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [category, setCategory] = useState(DOCUMENT_CATEGORIES[0]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch(`/api/applications/${applicationId}/documents`);
    if (res.ok) setDocs((await res.json()).documents);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", category);
    const res = await fetch(`/api/applications/${applicationId}/documents`, {
      method: "POST",
      body: fd,
    });
    setUploading(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || "Upload failed.");
      return;
    }
    if (fileRef.current) fileRef.current.value = "";
    await load();
    // Auto-run AI check (ignore failures / not-configured).
    if (json.id) {
      fetch(`/api/documents/${json.id}/ai-check`, { method: "POST" }).then(() => load());
      // optimistic refresh shortly after
      setTimeout(load, 1500);
    }
  }

  async function runAiCheck(id: string) {
    setDocs((d) => d.map((x) => (x.id === id ? { ...x, aiStatus: "CHECKING" } : x)));
    await fetch(`/api/documents/${id}/ai-check`, { method: "POST" });
    load();
  }

  async function review(id: string, reviewStatus: string) {
    await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewStatus }),
    });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="card p-6">
      <h3 className="text-base font-bold text-ink-900">{t.docs.title}</h3>
      <p className="mt-1 text-sm text-ink-500">{t.docs.subtitle}</p>

      {canUpload && (
        <form onSubmit={onUpload} className="mt-4 rounded-xl border border-ink-200 bg-ink-50/50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="label">{t.docs.category}</label>
              <PrettySelect
                value={category}
                onChange={setCategory}
                options={DOCUMENT_CATEGORIES as unknown as string[]}
              />
            </div>
            <div className="flex-1">
              <label className="label">{t.docs.file}</label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                required
                className="block w-full rounded-lg border border-ink-200 bg-white text-sm text-ink-600 file:mr-3 file:h-[42px] file:border-0 file:bg-brand-600 file:px-3 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700"
              />
            </div>
            <button type="submit" disabled={uploading} className="btn-primary sm:w-auto">
              {uploading ? t.docs.uploading : t.docs.upload}
            </button>
          </div>
          <p className="mt-2 text-xs text-ink-400">{fmt(t.docs.maxSize, { mb: maxMb })}</p>
        </form>
      )}

      {error && <p className="mt-3 text-sm text-brand-600">{error}</p>}

      <div className="mt-4 space-y-3">
        {docs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-ink-300 bg-ink-50 px-4 py-6 text-center text-sm text-ink-400">
            {t.docs.noDocs}
          </p>
        ) : (
          docs.map((d) => {
            const result = d.aiResult ? safeParse(d.aiResult) : null;
            return (
              <div key={d.id} className="rounded-xl border border-ink-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{d.mimeType === "application/pdf" ? "📄" : "🖼️"}</span>
                      <span className="truncate font-semibold text-ink-900">{d.originalName}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {d.category} · {(d.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {d.aiStatus === "CHECKING" && (
                      <span className="badge bg-blue-100 text-blue-700">{t.docs.aiChecking}</span>
                    )}
                    {d.aiStatus === "DONE" && d.aiVerdict && (
                      <span className={`badge ${VERDICT_STYLE[d.aiVerdict] || "bg-ink-100 text-ink-600"}`}>
                        {t.docs.aiReview}: {d.aiVerdict}
                      </span>
                    )}
                    <span className={`badge ${REVIEW_STYLE[d.reviewStatus]}`}>
                      {d.reviewStatus === "ACCEPTED"
                        ? t.docs.accepted
                        : d.reviewStatus === "REJECTED"
                        ? t.docs.rejected
                        : t.docs.pending}
                    </span>
                  </div>
                </div>

                {/* AI findings */}
                {result?.issues?.length > 0 && (
                  <ul className="mt-2 list-inside list-disc text-xs text-amber-700">
                    {result.issues.slice(0, 5).map((iss: string, i: number) => (
                      <li key={i}>{iss}</li>
                    ))}
                  </ul>
                )}
                {result && (result.expiryDate || result.fullName || result.documentNumber) && (
                  <p className="mt-1 text-xs text-ink-500">
                    {result.fullName ? `${result.fullName} · ` : ""}
                    {result.documentNumber ? `#${result.documentNumber} · ` : ""}
                    {result.expiryDate ? `exp ${result.expiryDate}` : ""}
                    {result.isExpired ? " ⚠️" : ""}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a
                    href={`/api/documents/${d.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary px-3 py-1.5 text-xs"
                  >
                    {t.docs.download}
                  </a>
                  {d.aiStatus !== "CHECKING" && (
                    <button onClick={() => runAiCheck(d.id)} className="btn-ghost border border-transparent px-3 py-1.5 text-xs">
                      {t.docs.runAiCheck}
                    </button>
                  )}
                  {isStaff && (
                    <>
                      <button
                        onClick={() => review(d.id, "ACCEPTED")}
                        className="btn-ghost border border-transparent px-3 py-1.5 text-xs text-emerald-700"
                      >
                        ✓ {t.docs.markAccepted}
                      </button>
                      <button
                        onClick={() => review(d.id, "REJECTED")}
                        className="btn-ghost border border-transparent px-3 py-1.5 text-xs text-red-600"
                      >
                        ✕ {t.docs.markRejected}
                      </button>
                    </>
                  )}
                  {canUpload && (
                    <button onClick={() => remove(d.id)} className="btn-ghost border border-transparent px-3 py-1.5 text-xs text-ink-400">
                      {t.docs.delete}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
