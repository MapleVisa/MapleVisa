import Link from "next/link";
import Logo from "./Logo";
import LogoutButton from "./LogoutButton";
import LanguageSwitcher from "./LanguageSwitcher";
import type { SessionUser } from "@/lib/auth";
import { getDictionary } from "@/i18n";

export default async function AppHeader({ user }: { user: SessionUser }) {
  const t = await getDictionary();
  const isStaff = user.role === "ADMIN" || user.role === "LAWYER";
  const roleLabel =
    user.role === "ADMIN" ? t.nav.admin : user.role === "LAWYER" ? t.nav.lawyer : t.nav.applicant;

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Logo href={isStaff ? "/admin" : "/dashboard"} />
          <nav className="hidden items-center gap-1 sm:flex">
            {isStaff ? (
              <>
                <Link href="/admin" className="btn-ghost">
                  {t.nav.reviewQueue}
                </Link>
                {user.role === "ADMIN" && (
                  <Link href="/admin/users" className="btn-ghost">
                    Users
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link href="/dashboard" className="btn-ghost">
                  {t.nav.myApplications}
                </Link>
                <Link href="/apply" className="btn-ghost">
                  {t.nav.startNew}
                </Link>
                <Link href="/messages" className="btn-ghost">
                  Messages
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <div className="hidden text-end sm:block">
            <div className="text-sm font-semibold text-ink-800">{user.fullName}</div>
            <div className="text-xs capitalize text-ink-500">{roleLabel}</div>
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
