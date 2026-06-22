"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CaseActions({
  id,
  role,
  status,
}: {
  id: string;
  role: "ADMIN" | "LAWYER";
  status: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function act(payload: Record<string, any>, requireNote = false) {
    if (requireNote && !note.trim()) {
      setError("Please add a note explaining what is needed.");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, ...(note.trim() ? { reviewNote: note.trim() } : {}) }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Action failed.");
      return;
    }
    setNote("");
    router.refresh();
  }

  // Validate (accept) and lawyer assignment live in the gated "Accept & assign"
  // panel; this list covers the remaining review transitions.
  const adminActions = [
    { label: "Mark under review", payload: { status: "UNDER_REVIEW" }, show: ["SUBMITTED"], style: "btn-secondary" },
    { label: "Request more info", payload: { status: "NEEDS_INFO" }, show: ["SUBMITTED", "UNDER_REVIEW"], style: "btn-secondary", requireNote: true },
    { label: "Close / reject", payload: { status: "REJECTED" }, show: ["SUBMITTED", "UNDER_REVIEW", "NEEDS_INFO", "VALIDATED"], style: "btn-ghost" },
  ];

  const lawyerActions = [
    { label: "⚖️ Take this case", payload: { assignLawyer: true, status: "WITH_LAWYER" }, show: ["VALIDATED"], style: "btn-primary" },
    { label: "Mark in processing", payload: { status: "IN_PROCESSING" }, show: ["WITH_LAWYER"], style: "btn-secondary" },
    { label: "✓ Mark approved", payload: { status: "APPROVED" }, show: ["WITH_LAWYER", "IN_PROCESSING"], style: "btn-primary" },
  ];

  const actions = (role === "ADMIN" ? adminActions : lawyerActions).filter((a) =>
    a.show.includes(status)
  );

  return (
    <div className="card p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">Actions</h3>

      {error && (
        <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{error}</p>
      )}

      <div className="mt-4">
        <label className="label">Add a note (optional, or required to request info)</label>
        <textarea
          className="input min-h-[80px]"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Visible to the applicant and recorded in the case timeline…"
        />
        {note.trim() && (
          <button onClick={() => act({})} disabled={busy} className="btn-secondary mt-2 w-full">
            Save note only
          </button>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {actions.length === 0 ? (
          <p className="text-sm text-ink-400">No further actions available for this status.</p>
        ) : (
          actions.map((a) => (
            <button
              key={a.label}
              onClick={() => act(a.payload, (a as any).requireNote)}
              disabled={busy}
              className={`${a.style} w-full`}
            >
              {a.label}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
