"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A styled dropdown (rounded corners, soft shadow) to replace the native
 * <select>, whose option list is drawn by the OS and can't be styled.
 */
export default function PrettySelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex items-center justify-between gap-2 text-start"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={value ? "text-ink-900" : "text-ink-400"}>{value || placeholder}</span>
        <svg viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 text-ink-400 transition ${open ? "rotate-180" : ""}`} fill="none">
          <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1.5 max-h-72 w-full overflow-auto rounded-xl border border-ink-200 bg-white p-1.5 shadow-card"
        >
          {options.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                role="option"
                aria-selected={opt === value}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-start text-sm transition ${
                  opt === value
                    ? "bg-brand-50 font-semibold text-brand-700"
                    : "text-ink-700 hover:bg-ink-50"
                }`}
              >
                {opt}
                {opt === value && (
                  <svg viewBox="0 0 20 20" className="h-4 w-4 text-brand-600" fill="none">
                    <path d="M5 10l3.5 3.5L15 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
