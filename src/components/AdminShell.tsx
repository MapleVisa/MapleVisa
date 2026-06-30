"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import LanguageSwitcher from "./LanguageSwitcher";
import Avatar from "./Avatar";
import LogoutButton from "./LogoutButton";

type ShellUser = { id: string; fullName: string; role: string };

const ICONS = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  message: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  ai: (
    <>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M12 8.5 13.2 11l2.5 1-2.5 1L12 15.5 10.8 13l-2.5-1 2.5-1z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  x: <path d="M6 6l12 12M6 18 18 6" />,
  leaf: (
    <>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6" />
    </>
  ),
};

function Icon({ name, className = "h-5 w-5" }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

const QUEUE_COLORS: Record<string, string> = {
  SUBMITTED: "bg-blue-500",
  UNDER_REVIEW: "bg-amber-500",
  NEEDS_INFO: "bg-orange-500",
  VALIDATED: "bg-green-500",
  WITH_LAWYER: "bg-violet-500",
  IN_PROCESSING: "bg-indigo-500",
  mine: "bg-violet-500",
  completed: "bg-green-500",
};

export default function AdminShell({
  user,
  avatarKey,
  counts,
  unread,
  children,
}: {
  user: ShellUser;
  avatarKey?: string | null;
  counts: Record<string, number>;
  unread: number;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isLawyer = user.role === "LAWYER";
  const isAdmin = user.role === "ADMIN";

  const inUsers = path.startsWith("/admin/users");
  const inMessages = path.startsWith("/admin/messages");
  const inAI = path.startsWith("/admin/ai");
  const inQueue = !inUsers && !inMessages && !inAI;

  const queues = isLawyer
    ? [
        { key: "mine", label: "My cases" },
        { key: "completed", label: "Completed cases" },
      ]
    : [
        { key: "SUBMITTED", label: "Awaiting review" },
        { key: "UNDER_REVIEW", label: "Under review" },
        { key: "NEEDS_INFO", label: "Needs info" },
        { key: "VALIDATED", label: "Validated" },
        { key: "WITH_LAWYER", label: "With lawyer" },
      ];

  // Lawyers filter by view (mine/completed); admins filter by status.
  const queueHref = (key: string) =>
    isLawyer ? (key === "completed" ? "/admin?view=completed" : "/admin") : `/admin?status=${key}`;

  const railItems = [
    { href: "/admin", label: "Queue", icon: "grid" as const, active: inQueue },
    ...(isAdmin ? [{ href: "/admin/users", label: "Users", icon: "users" as const, active: inUsers }] : []),
    { href: "/admin/messages", label: "Chat", icon: "message" as const, active: inMessages },
    { href: "/admin/ai", label: "AI", icon: "ai" as const, active: inAI },
  ];

  const navCls = (active: boolean) =>
    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
      active ? "bg-brand-50 font-semibold text-brand-700" : "text-ink-600 hover:bg-ink-100"
    }`;

  // Sidebar nav (links + queue filters) — shared by the desktop sidebar and the
  // mobile slide-over drawer. `onNavigate` closes the drawer after a tap.
  const renderNav = (onNavigate?: () => void) => (
    <>
      <div className="flex flex-col gap-0.5 p-2">
        <Link href="/admin" className={navCls(inQueue)} onClick={onNavigate}>
          <Icon name="grid" className="h-4 w-4" /> Review queue
        </Link>
        {isAdmin && (
          <Link href="/admin/users" className={navCls(inUsers)} onClick={onNavigate}>
            <Icon name="users" className="h-4 w-4" /> Users
          </Link>
        )}
        <Link href="/admin/messages" className={navCls(inMessages)} onClick={onNavigate}>
          <Icon name="message" className="h-4 w-4" /> Messages
          {unread > 0 && (
            <span className="ms-auto rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white">{unread}</span>
          )}
        </Link>
        <Link href="/admin/ai" className={navCls(inAI)} onClick={onNavigate}>
          <Icon name="ai" className="h-4 w-4" /> AI assistant
        </Link>
      </div>

      <div className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Queues</div>
      <div className="flex flex-col px-2">
        {queues.map((q) => (
          <Link
            key={q.key}
            href={queueHref(q.key)}
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-ink-600 hover:bg-ink-50"
          >
            <span className={`h-2 w-2 rounded-full ${QUEUE_COLORS[q.key] ?? "bg-ink-300"}`} />
            {q.label}
            <span className="ms-auto text-xs text-ink-400">{counts[q.key] || 0}</span>
          </Link>
        ))}
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-ink-50">
      {/* Icon rail (desktop only) */}
      <nav className="hidden w-16 shrink-0 flex-col items-center gap-1 border-r border-ink-200 bg-white py-3 md:flex" aria-label="Primary">
        <Link href="/admin" className="mb-2 flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand-600 text-white">
          <Icon name="leaf" className="h-5 w-5" />
        </Link>
        {railItems.map((it) => (
          <Link
            key={it.label}
            href={it.href}
            className={`flex w-full flex-col items-center gap-0.5 py-2 text-[11px] ${
              it.active ? "text-brand-600" : "text-ink-400 hover:text-ink-700"
            }`}
          >
            <Icon name={it.icon} className="h-5 w-5" />
            {it.label}
          </Link>
        ))}
      </nav>

      {/* Sidebar (desktop only) */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-ink-200 bg-white md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-ink-200 px-4">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-brand-600 text-[11px] font-bold text-white">A</span>
          <span className="text-sm font-semibold text-ink-900">AI Visa</span>
        </div>
        {renderNav()}
      </aside>

      {/* Mobile slide-over drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[80%] flex-col bg-white shadow-card">
            <div className="flex h-14 items-center justify-between border-b border-ink-200 px-4">
              <span className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-white">
                  <Icon name="leaf" className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold text-ink-900">AI Visa</span>
              </span>
              <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100">
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto pb-4">{renderNav(() => setMenuOpen(false))}</div>
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-ink-200 bg-white px-3 sm:gap-3 sm:px-4">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="shrink-0 rounded-lg p-1.5 text-ink-600 hover:bg-ink-100 md:hidden"
          >
            <Icon name="menu" className="h-6 w-6" />
          </button>

          <form action="/admin" method="GET" className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-ink-200 px-3 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 sm:max-w-sm">
            <Icon name="search" className="h-4 w-4 shrink-0 text-ink-400" />
            <input
              name="q"
              type="search"
              placeholder="Search applications"
              className="w-full min-w-0 bg-transparent text-sm text-ink-800 outline-none placeholder:text-ink-400"
            />
          </form>

          <div className="hidden flex-1 md:block" />
          <div className="hidden sm:block">
            <LanguageSwitcher compact />
          </div>
          <Link href="/profile" className="flex shrink-0 items-center gap-2 rounded-full p-0.5 sm:pe-2 hover:bg-ink-100" title="Your profile">
            <Avatar id={user.id} name={user.fullName} avatarKey={avatarKey} className="h-8 w-8" />
            <span className="hidden text-sm font-semibold text-ink-800 sm:block">{user.fullName}</span>
          </Link>
          <LogoutButton />
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
