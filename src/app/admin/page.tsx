import Link from "next/link";
import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import StatusBadge from "@/components/StatusBadge";
import MessageList from "@/components/MessageList";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { localizeProgramNames } from "@/lib/i18n/programs";
import { getDictionary, getLocale } from "@/i18n";
import { listTeamInbox } from "@/lib/messages";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN" && user.role !== "LAWYER") redirect("/dashboard");

  const locale = await getLocale();
  const t = await getDictionary(locale);
  const programNames = await localizeProgramNames(locale);
  const fmtDate = (d: Date | null) =>
    d ? new Date(d).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "—";

  const isLawyer = user.role === "LAWYER";

  const where: any = isLawyer
    ? { OR: [{ lawyerId: user.id }, { status: { in: ["VALIDATED", "WITH_LAWYER", "IN_PROCESSING"] } }] }
    : { status: { not: "DRAFT" } };

  const apps = await prisma.application.findMany({
    where,
    orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
    include: { user: true, lawyer: true },
  });

  // Messages applicants have sent to the staff team (admin landing only).
  const teamMessages = isLawyer ? [] : await listTeamInbox(50);

  // Group counts
  const counts: Record<string, number> = {};
  for (const a of apps) counts[a.status] = (counts[a.status] || 0) + 1;

  const queues = isLawyer
    ? [
        { key: "VALIDATED", label: "Ready for a lawyer" },
        { key: "WITH_LAWYER", label: "With me" },
        { key: "IN_PROCESSING", label: "In processing" },
      ]
    : [
        { key: "SUBMITTED", label: "Awaiting review" },
        { key: "UNDER_REVIEW", label: "Under review" },
        { key: "NEEDS_INFO", label: "Needs info" },
        { key: "VALIDATED", label: "Validated" },
        { key: "WITH_LAWYER", label: "With lawyer" },
      ];

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-ink-900">
          {isLawyer ? t.admin.lawyerTitle : t.admin.reviewTitle}
        </h1>
        <p className="mt-1 text-ink-500">
          {isLawyer ? t.admin.lawyerSubtitle : t.admin.reviewSubtitle}
        </p>

        {/* Stat chips */}
        <div className="mt-6 flex flex-wrap gap-3">
          {queues.map((q) => (
            <div key={q.key} className="rounded-xl border border-ink-200 bg-white px-4 py-3 shadow-soft">
              <div className="text-2xl font-bold text-ink-900">{counts[q.key] || 0}</div>
              <div className="text-xs text-ink-500">{q.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="card mt-8 overflow-hidden">
          {apps.length === 0 ? (
            <div className="px-6 py-16 text-center text-ink-400">{t.admin.empty}</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-5 py-3">{t.admin.reference}</th>
                  <th className="px-5 py-3">{t.admin.applicant}</th>
                  <th className="px-5 py-3">{t.admin.program}</th>
                  <th className="px-5 py-3">{t.admin.submitted}</th>
                  <th className="px-5 py-3">{t.admin.statusCol}</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {apps.map((a) => (
                  <tr key={a.id} className="hover:bg-ink-50/60">
                    <td className="px-5 py-4 font-mono text-xs text-ink-600">{a.reference}</td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-ink-900">{a.user.fullName}</div>
                      <div className="text-xs text-ink-400">{a.user.email}</div>
                    </td>
                    <td className="px-5 py-4 text-ink-700">{programNames[a.program] ?? a.program}</td>
                    <td className="px-5 py-4 text-xs text-ink-500">{fmtDate(a.submittedAt)}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/admin/${a.id}`} className="font-semibold text-brand-600 hover:underline">
                        {t.admin.open}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!isLawyer && (
          <section className="mt-10">
            <h2 className="text-lg font-bold text-ink-900">Messages from users</h2>
            <p className="mt-1 text-sm text-ink-500">
              Messages applicants have sent to the team. Open an applicant to reply.
            </p>
            <div className="card mt-4 p-6">
              <MessageList
                messages={teamMessages}
                viewerIsStaff
                emptyText="No messages from users yet."
              />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
