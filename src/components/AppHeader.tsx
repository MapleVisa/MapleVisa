import Link from "next/link";
import Logo from "./Logo";
import LogoutButton from "./LogoutButton";
import LanguageSwitcher from "./LanguageSwitcher";
import Avatar from "./Avatar";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDictionary } from "@/i18n";

export default async function AppHeader({ user }: { user: SessionUser }) {
  const t = await getDictionary();
  const isStaff = user.role === "ADMIN" || user.role === "LAWYER";

  // Profile image (if any) for the top-bar avatar.
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { avatarKey: true },
  });

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-[90%] items-center justify-between">
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
                <Link href="/messages" className="btn-ghost">
                  Messages
                </Link>
              </>
            ) : (
              <>
                <Link href="/dashboard" className="btn-ghost">
                  {t.nav.myApplications}
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
          {isStaff ? (
            <div className="flex items-center gap-2">
              <Avatar id={user.id} name={user.fullName} avatarKey={dbUser?.avatarKey} />
              <div className="hidden text-end sm:block">
                <div className="text-sm font-semibold text-ink-800">{user.fullName}</div>
              </div>
            </div>
          ) : (
            // Applicants: avatar + name link to their profile; role is not shown.
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-full p-0.5 pe-2 transition hover:bg-ink-100"
              title="Your profile"
            >
              <Avatar id={user.id} name={user.fullName} avatarKey={dbUser?.avatarKey} />
              <span className="hidden text-sm font-semibold text-ink-800 sm:block">
                {user.fullName}
              </span>
            </Link>
          )}
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
