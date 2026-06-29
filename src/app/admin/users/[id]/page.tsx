import Link from "next/link";
import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import BackButton from "@/components/BackButton";
import StatusBadge from "@/components/StatusBadge";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { localizeProgramNames } from "@/lib/i18n/programs";
import { getLocale } from "@/i18n";

const ROLE_LABEL: Record<string, string> = {
  APPLICANT: "Applicant",
  ADMIN: "Case officer",
  LAWYER: "Lawyer",
};

export default async function AdminUserProfilePage({ params }: { params: { id: string } }) {
  const staff = await getCurrentUser();
  if (!staff) redirect("/login");
  if (staff.role !== "ADMIN") redirect("/admin");

  const profile = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      applications: { orderBy: { updatedAt: "desc" } },
    },
  });
  if (!profile) redirect("/admin/users");

  const locale = await getLocale();
  const programNames = await localizeProgramNames(locale);
  const isApplicant = profile.role === "APPLICANT";

  const fmtDate = (d: Date | null) =>
    d ? new Date(d).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" }) : "—";

  return (
    <div className="min-h-screen">
      <AppHeader user={staff} />
      <main className="mx-auto w-[90%] py-8">
        <BackButton href="/admin/users" />
        <div className="mb-6 flex items-center gap-2 text-sm text-ink-400">
          <Link href="/admin/users" className="hover:text-ink-600">
            Users
          </Link>
          <span>/</span>
          <span className="text-ink-600">{profile.fullName}</span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink-900">{profile.fullName}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {ROLE_LABEL[profile.role] ?? profile.role} · {profile.email}
            {profile.phone ? ` · ${profile.phone}` : ""} · Joined {fmtDate(profile.createdAt)}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {/* Applications */}
            <div className="card p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">
                Applications ({profile.applications.length})
              </h2>
              {profile.applications.length === 0 ? (
                <p className="mt-4 text-sm text-ink-400">This user has no applications.</p>
              ) : (
                <ul className="mt-4 divide-y divide-ink-100">
                  {profile.applications.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink-900">
                            {programNames[a.program] ?? a.program}
                          </span>
                          <StatusBadge status={a.status} />
                        </div>
                        <div className="font-mono text-xs text-ink-400">{a.reference}</div>
                      </div>
                      <Link href={`/admin/${a.id}`} className="text-sm font-semibold text-brand-600 hover:underline">
                        Open case
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>

          {/* Chat */}
          <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
            {isApplicant ? (
              <div className="card p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">Chat</h2>
                <p className="mt-2 text-sm text-ink-500">
                  Message this applicant directly — text, voice notes and documents.
                </p>
                <Link href={`/messages?with=${profile.id}`} className="btn-primary mt-4 w-full gap-2">
                  💬 Open chat with {profile.fullName.split(" ")[0]}
                </Link>
              </div>
            ) : (
              <div className="card p-6 text-sm text-ink-400">
                Chat is available for applicants.
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
