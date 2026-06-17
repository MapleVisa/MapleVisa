"use client";

import { STATUS_META, type AppStatus } from "@/lib/status";
import { useT } from "@/i18n/IntlProvider";

export default function StatusBadge({ status }: { status: string }) {
  const t = useT();
  const color = STATUS_META[status as AppStatus]?.color ?? "bg-ink-100 text-ink-700";
  const label = (t.status as Record<string, string>)[status] ?? status;
  return <span className={`badge ${color}`}>{label}</span>;
}
