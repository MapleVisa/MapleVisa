import Link from "next/link";
import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import BackButton from "@/components/BackButton";
import StatusBadge from "@/components/StatusBadge";
import MessageList from "@/components/MessageList";
import MessageComposer from "@/components/MessageComposer";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { localizeProgramNames } from "@/lib/i18n/programs";
import { listMessagesForUser } from "@/lib/messages";
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
  const messages = await listMessagesForUser(profile.id);
  const isApplicant = profile.role === "APPLICANT";

  const fmtDate = (d: Date | null) =>
    d ? new Date(d).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" }) : "—";

  return (
    <div className="min-h-screen">
      <AppHeader user={staff} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
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

            {/* Message history */}
            <div className="card p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">
                Message history
              </h2>
              <div className="mt-4">
                <MessageList messages={messages} viewerIsStaff emptyText="No messages with this user yet." />
              </div>
            </div>
          </div>

          {/* Composer */}
          <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
            <div id="message" />
            {isApplicant ? (
              <MessageComposer
                toUserId={profile.id}
                title="Email this user"
                placeholder="Write a message to this applicant…"
              />
            ) : (
              <div className="card p-6 text-sm text-ink-400">
                Messaging is available for applicants.
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
