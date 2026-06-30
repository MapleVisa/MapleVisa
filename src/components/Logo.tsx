import Link from "next/link";

export default function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 font-bold text-ink-900">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-lg text-white shadow-soft">
        🍁
      </span>
      <span className="text-lg tracking-tight">
        AI <span className="text-brand-600">Visa</span>
      </span>
    </Link>
  );
}
