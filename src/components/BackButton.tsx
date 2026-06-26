"use client";

import { useRouter } from "next/navigation";

// A back button for subpages. Pass `href` to go to a specific parent page, or
// omit it to go back in history. Inline arrow icon — no asset needed.
export default function BackButton({ href, label = "Back" }: { href?: string; label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (href ? router.push(href) : router.back())}
      className="mb-4 inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm font-semibold text-ink-600 shadow-sm transition hover:bg-ink-50 hover:text-ink-900"
    >
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
        <path d="M12.5 15l-5-5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </button>
  );
}
