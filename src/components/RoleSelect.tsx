"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LABELS: Record<string, string> = {
  APPLICANT: "Applicant",
  LAWYER: "Lawyer",
  ADMIN: "Case officer (Admin)",
};

// Inline role changer for the admin Users list. Promoting to Admin shows a
// strong confirmation warning first.
export default function RoleSelect({ userId, role }: { userId: string; role: string }) {
  const router = useRouter();
  const [value, setValue] = useState(role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onChange(next: string) {
    if (next === value || busy) return;

    if (next === "ADMIN") {
      const ok = window.confirm(
        "Make this user an ADMIN?\n\n" +
          "Admins can view and manage ALL applications, users and messages, " +
          "approve cases, assign lawyers, and change other people's roles — " +
          "including removing other admins.\n\n" +
          "Only promote people you fully trust. Continue?"
      );
      if (!ok) return;
    }

    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: next }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Could not change role.");
      return;
    }
    setValue(next);
    router.refresh();
  }

  return (
    <div>
      <select
        value={value}
        disabled={busy}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded-lg border px-2 py-1 text-sm ${
          value === "ADMIN" ? "border-brand-300 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-700"
        }`}
      >
        <option value="APPLICANT">{LABELS.APPLICANT}</option>
        <option value="LAWYER">{LABELS.LAWYER}</option>
        <option value="ADMIN">{LABELS.ADMIN}</option>
      </select>
      {error && <p className="mt-1 text-xs text-brand-600">{error}</p>}
    </div>
  );
}
