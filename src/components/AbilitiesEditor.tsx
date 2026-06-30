"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Ability = { key: string; label: string; hint?: string };

// Super-admin only: grant/revoke a specific admin's abilities. Each toggle saves
// immediately. The list of abilities is passed in from the server.
export default function AbilitiesEditor({
  userId,
  initial,
  abilities,
}: {
  userId: string;
  initial: string[];
  abilities: Ability[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function toggle(key: string) {
    const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
    setSelected(next);
    setBusy(true);
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: next }),
    }).catch(() => {});
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-ink-50"
      >
        {selected.length === abilities.length
          ? "All abilities"
          : selected.length === 0
          ? "No abilities"
          : `${selected.length} of ${abilities.length}`}
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-ink-400" fill="none">
          <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute end-0 z-50 mt-1 w-64 rounded-xl border border-ink-200 bg-white p-1.5 shadow-card">
          {abilities.map((a) => (
            <label
              key={a.key}
              className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 hover:bg-ink-50"
            >
              <input
                type="checkbox"
                checked={selected.includes(a.key)}
                onChange={() => toggle(a.key)}
                disabled={busy}
                className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink-800">{a.label}</span>
                {a.hint && <span className="block text-xs text-ink-400">{a.hint}</span>}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
