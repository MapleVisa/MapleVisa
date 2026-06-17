"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/IntlProvider";

// Lets an applicant terminate an application from the dashboard.
// mode "withdraw": submitted/active application -> POST .../withdraw (status WITHDRAWN).
// mode "delete":   a never-submitted draft       -> DELETE the application.
// Two-step inline confirm so it can't be triggered by an accidental click.
export default function WithdrawButton({
  applicationId,
  mode = "withdraw",
  className = "",
}: {
  applicationId: string;
  mode?: "withdraw" | "delete";
  className?: string;
}) {
  const t = useT();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const cfg =
    mode === "delete"
      ? {
          url: `/api/applications/${applicationId}`,
          method: "DELETE" as const,
          label: t.dashboard.deleteDraft,
          confirm: t.dashboard.deleteConfirm,
          yes: t.dashboard.deleteYes,
        }
      : {
          url: `/api/applications/${applicationId}/withdraw`,
          method: "POST" as const,
          label: t.dashboard.withdraw,
          confirm: t.dashboard.withdrawConfirm,
          yes: t.dashboard.withdrawYes,
        };

  async function run() {
    setBusy(true);
    const res = await fetch(cfg.url, { method: cfg.method });
    if (res.ok) {
      router.refresh();
    } else {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span className={`relative z-10 inline-flex items-center gap-2 ${className}`}>
        <span className="text-xs text-ink-500">{cfg.confirm}</span>
        <button
          onClick={run}
          disabled={busy}
          className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
        >
          {busy ? t.common.loading : cfg.yes}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="text-xs text-ink-400 hover:text-ink-600"
        >
          {t.common.cancel}
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className={`relative z-10 text-xs font-medium text-ink-400 hover:text-red-600 ${className}`}
    >
      {cfg.label}
    </button>
  );
}
