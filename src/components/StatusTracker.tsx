"use client";

import { PIPELINE, type AppStatus } from "@/lib/status";
import { useT } from "@/i18n/IntlProvider";

export default function StatusTracker({ status }: { status: string }) {
  const t = useT();
  const statusLabels = t.status as Record<string, string>;

  // REJECTED / WITHDRAWN / NEEDS_INFO are off-pipeline; show a notice instead.
  if (status === "REJECTED") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {statusLabels.REJECTED}
      </div>
    );
  }
  if (status === "WITHDRAWN") {
    return (
      <div className="rounded-xl border border-ink-200 bg-ink-50 p-4 text-sm text-ink-500">
        {statusLabels.WITHDRAWN}
      </div>
    );
  }

  const currentIndex = PIPELINE.indexOf(status as AppStatus);

  return (
    <div>
      {status === "NEEDS_INFO" && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
          {statusLabels.NEEDS_INFO}
        </div>
      )}
      <ol className="flex flex-col gap-0 sm:flex-row sm:items-start">
        {PIPELINE.map((s, i) => {
          const reached = currentIndex >= i && currentIndex !== -1;
          const isCurrent = currentIndex === i;
          return (
            <li key={s} className="flex flex-1 items-start gap-3 sm:flex-col sm:items-center sm:text-center">
              <div className="flex items-center sm:w-full sm:flex-col">
                <div className="flex sm:w-full sm:items-center">
                  <span className="hidden flex-1 sm:block" />
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      reached ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-400"
                    } ${isCurrent ? "ring-4 ring-brand-100" : ""}`}
                  >
                    {reached && !isCurrent ? "✓" : i + 1}
                  </span>
                  <span
                    className={`hidden h-0.5 flex-1 sm:block ${
                      currentIndex > i ? "bg-brand-600" : "bg-ink-200"
                    } ${i === PIPELINE.length - 1 ? "invisible" : ""}`}
                  />
                </div>
              </div>
              <div className="pb-6 sm:pb-0 sm:pt-2">
                <p className={`text-sm font-semibold ${reached ? "text-ink-900" : "text-ink-400"}`}>
                  {statusLabels[s]}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
