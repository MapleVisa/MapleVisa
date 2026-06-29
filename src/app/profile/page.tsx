import Link from "next/link";
import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import ProfileForm from "@/components/ProfileForm";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, fullName: true, email: true, phone: true, address: true, avatarKey: true },
  });
  if (!me) redirect("/login");

  const isStaff = user.role === "ADMIN" || user.role === "LAWYER";
  const dashHref = isStaff ? "/admin" : "/dashboard";

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Minimal top bar — just the brand and a Dashboard button. */}
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex h-16 w-[90%] items-center justify-between">
          <Logo href={dashHref} />
          <Link href={dashHref} className="btn-secondary gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
            Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto w-[90%] py-8">
        <h1 className="text-2xl font-bold text-ink-900">Your profile</h1>
        <p className="mt-1 text-ink-500">
          Update your photo and contact details. Your name and photo appear in the top bar.
        </p>
        <div className="mt-8">
          <ProfileForm
            id={me.id}
            initial={{
              fullName: me.fullName,
              email: me.email,
              phone: me.phone ?? "",
              address: me.address ?? "",
              avatarKey: me.avatarKey,
            }}
          />
        </div>
      </main>
    </div>
  );
}
