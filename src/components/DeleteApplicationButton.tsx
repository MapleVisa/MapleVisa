"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Admin-only: permanently delete an application. `redirectTo` is used from the
// case page (go back to the queue); on the dashboard it just refreshes the list.
export default function DeleteApplicationButton({
  id,
  reference,
  redirectTo,
  className = "btn-ghost w-full text-brand-600",
  label = "Delete application",
}: {
  id: string;
  reference?: string;
  redirectTo?: string;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    const ok = window.confirm(
      `Permanently delete application ${reference ? `${reference} ` : ""}?\n\n` +
        "This removes the application and ALL of its documents, messages, and history. " +
        "This cannot be undone."
    );
    if (!ok) return;
    setBusy(true);
    const res = await fetch(`/api/admin/applications/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setBusy(false);
      const j = await res.json().catch(() => ({}));
      alert(j.error || "Could not delete the application.");
      return;
    }
    if (redirectTo) router.push(redirectTo);
    else router.refresh();
  }

  return (
    <button onClick={onDelete} disabled={busy} className={className}>
      {busy ? "Deleting…" : label}
    </button>
  );
}
