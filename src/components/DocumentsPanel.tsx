"use client";

import { useEffect, useState } from "react";
import { useT } from "@/i18n/IntlProvider";
import { DOCUMENT_CATEGORIES } from "@/lib/documents";
import PrettySelect from "./PrettySelect";

type Doc = {
  id: string;
  category: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

type Check = {
  completeness: number;
  present: string[];
  missing: string[];
  notes: string;
  status: "green" | "yellow" | "red";
  at: string;
};

type Requirement = { category: string; help: string; requiredInfo: string[] };

export default function DocumentsPanel({
  applicationId,
  canUpload,
  maxMb,
}: {
  applicationId: string;
  canUpload: boolean;
  isStaff?: boolean;
  maxMb: number;
}) {
  const t = useT();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [checks, setChecks] = useState<Record<string, Check>>({});
  const [busy, setBusy] = useState<string | null>(null); // category currently uploading/checking
  const [error, setError] = useState("");
  const [otherCategory, setOtherCategory] = useState("Other");

  async function load() {
    const res = await fetch(`/api/applications/${applicationId}/documents`);
    if (res.ok) {
      const j = await res.json();
      setDocs(j.documents || []);
      setRequirements(j.requirements || []);
      setChecks(j.checks || {});
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requiredCategories = new Set(requirements.map((r) => r.category));
  const docsFor = (category: string) => docs.filter((d) => d.category === category);

  async function runCheck(category: string) {
    await fetch(`/api/applications/${applicationId}/doc-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category }),
    }).catch(() => {});
    await load();
  }

  async function uploadTo(category: string, fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError("");
    setBusy(category);
    for (const file of Array.from(fileList)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", category);
      const res = await fetch(`/api/applications/${applicationId}/documents`, { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Upload failed.");
      }
    }
    await load();
    if (requiredCategories.has(category)) await runCheck(category);
    setBusy(null);
  }

  async function removeDoc(id: string, category: string) {
    setBusy(category);
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    await load();
    if (requiredCategories.has(category)) await runCheck(category);
    setBusy(null);
  }

  const otherDocs = docs.filter((d) => !requiredCategories.has(d.category));

  return (
    <div className="card p-6">
      <h3 className="text-base font-bold text-ink-900">{t.docs.title}</h3>
      <p className="mt-1 text-sm text-ink-500">
        Upload the required documents below. You can add several files for each one — our AI checks
        them together and tells you what’s still missing.
      </p>

      {error && <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{error}</p>}

      {/* Required documents checklist */}
      <div className="mt-5 space-y-4">
        {requirements.map((req) => {
          const list = docsFor(req.category);
          const check = checks[req.category];
          const checking = busy === req.category;
          return (
            <RequirementCard
              key={req.category}
              req={req}
              docs={list}
              check={check}
              checking={checking}
              canUpload={canUpload}
              maxMb={maxMb}
              onUpload={(files) => uploadTo(req.category, files)}
              onRemove={(id) => removeDoc(id, req.category)}
              onRecheck={() => runCheck(req.category)}
            />
          );
        })}
      </div>

      {/* Other / optional documents */}
      <div className="mt-8">
        <h4 className="text-sm font-semibold text-ink-700">Other documents (optional)</h4>
        <p className="mt-0.5 text-xs text-ink-400">
          Anything else you’d like to provide (police certificate, photo, reference letters, etc.).
        </p>

        {canUpload && (
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="label">Document type</label>
              <PrettySelect
                value={otherCategory}
                onChange={setOtherCategory}
                options={DOCUMENT_CATEGORIES.filter((c) => !requiredCategories.has(c))}
              />
            </div>
            <label className="btn-secondary cursor-pointer">
              {busy === otherCategory ? "Uploading…" : "Add files"}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                hidden
                onChange={(e) => uploadTo(otherCategory, e.target.files)}
              />
            </label>
          </div>
        )}

        <div className="mt-3 space-y-2">
          {otherDocs.length === 0 ? (
            <p className="text-xs text-ink-400">No other documents uploaded.</p>
          ) : (
            otherDocs.map((d) => (
              <FileRow key={d.id} doc={d} canRemove={canUpload} onRemove={() => removeDoc(d.id, d.category)} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, checking }: { status?: Check["status"]; checking: boolean }) {
  if (checking) {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700" title="Checking…">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700" />
      </span>
    );
  }
  const map = {
    green: { cls: "bg-emerald-100 text-emerald-700", sym: "✓", title: "Complete" },
    yellow: { cls: "bg-amber-100 text-amber-700", sym: "!", title: "Almost there — you can still submit" },
    red: { cls: "bg-red-100 text-red-700", sym: "✕", title: "Required — please complete this" },
  } as const;
  const s = map[status ?? "red"];
  return (
    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${s.cls}`} title={s.title}>
      {s.sym}
    </span>
  );
}

function RequirementCard({
  req,
  docs,
  check,
  checking,
  canUpload,
  maxMb,
  onUpload,
  onRemove,
  onRecheck,
}: {
  req: Requirement;
  docs: Doc[];
  check?: Check;
  checking: boolean;
  canUpload: boolean;
  maxMb: number;
  onUpload: (files: FileList | null) => void;
  onRemove: (id: string) => void;
  onRecheck: () => void;
}) {
  const status = check?.status;
  const border =
    status === "green"
      ? "border-emerald-200"
      : status === "yellow"
      ? "border-amber-200"
      : "border-ink-200";

  return (
    <div className={`rounded-xl border ${border} p-4`}>
      <div className="flex items-start gap-3">
        <StatusBadge status={status} checking={checking} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink-900">{req.category}</span>
            <span className="text-brand-600">*</span>
          </div>
          <p className="mt-0.5 text-xs text-ink-500">{req.help}</p>

          {/* Status guidance */}
          {!checking && (
            <div className="mt-2 text-xs">
              {status === "green" && (
                <p className="text-emerald-700">✓ All required details were found.</p>
              )}
              {status === "yellow" && (
                <p className="text-amber-700">
                  Almost complete — you can submit, but consider adding:{" "}
                  {(check?.missing || []).join(", ") || "more detail"}.
                </p>
              )}
              {status === "red" && docs.length > 0 && (
                <p className="text-red-600">
                  Not enough detail yet — please add a clearer file or the missing parts:{" "}
                  {(check?.missing || []).join(", ") || "required details"}. You can’t submit until
                  this is improved.
                </p>
              )}
              {(!check || docs.length === 0) && (
                <p className="text-ink-500">
                  Please upload this document. Make sure it shows: {req.requiredInfo.join(", ")}.
                </p>
              )}
              {check?.notes && status !== "green" && (
                <p className="mt-1 text-ink-400">{check.notes}</p>
              )}
            </div>
          )}

          {/* Uploaded files */}
          {docs.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {docs.map((d) => (
                <FileRow key={d.id} doc={d} canRemove={canUpload} onRemove={() => onRemove(d.id)} />
              ))}
            </div>
          )}

          {/* Actions */}
          {canUpload && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="btn-secondary cursor-pointer px-3 py-1.5 text-xs">
                {checking ? "Working…" : docs.length ? "Add more files" : "Upload file(s)"}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  hidden
                  disabled={checking}
                  onChange={(e) => onUpload(e.target.files)}
                />
              </label>
              {docs.length > 0 && (
                <button
                  onClick={onRecheck}
                  disabled={checking}
                  className="btn-ghost border border-transparent px-3 py-1.5 text-xs"
                >
                  Re-check
                </button>
              )}
              <span className="text-xs text-ink-400">PDF, JPG or PNG · up to {maxMb} MB each</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FileRow({ doc, canRemove, onRemove }: { doc: Doc; canRemove: boolean; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-ink-100 bg-ink-50/50 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span>{doc.mimeType === "application/pdf" ? "📄" : "🖼️"}</span>
        <span className="truncate text-sm text-ink-700">{doc.originalName}</span>
        <span className="shrink-0 text-xs text-ink-400">{(doc.size / 1024).toFixed(0)} KB</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <a href={`/api/documents/${doc.id}`} target="_blank" rel="noreferrer" className="btn-ghost px-2 py-1 text-xs">
          View
        </a>
        {canRemove && (
          <button onClick={onRemove} className="btn-ghost px-2 py-1 text-xs text-ink-400">
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
