import Link from "next/link";
import { redirect } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { localizeProgramNames } from "@/lib/i18n/programs";
import { getDictionary, getLocale } from "@/i18n";
import { unreadTeamCount } from "@/lib/messages";

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Awaiting review",
  UNDER_REVIEW: "Under review",
  NEEDS_INFO: "Needs info",
  VALIDATED: "Validated",
  WITH_LAWYER: "With lawyer",
  IN_PROCESSING: "In processing",
  APPROVED: "Approved",
  REJECTED: "Closed",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN" && user.role !== "LAWYER") redirect("/dashboard");

  const locale = await getLocale();
  const t = await getDictionary(locale);
  const programNames = await localizeProgramNames(locale);
  const fmtDate = (d: Date | null) =>
    d ? new Date(d).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "—";

  const isLawyer = user.role === "LAWYER";
  const statusFilter = searchParams?.status && STATUS_LABEL[searchParams.status] ? searchParams.status : null;
  const q = (searchParams?.q || "").trim();

  const baseWhere: any = isLawyer
    ? { OR: [{ lawyerId: user.id }, { status: { in: ["VALIDATED", "WITH_LAWYER", "IN_PROCESSING"] } }] }
    : { status: { not: "DRAFT" } };

  const filters: any[] = [baseWhere];
  if (statusFilter) filters.push({ status: statusFilter });
  if (q)
    filters.push({
      OR: [
        { reference: { contains: q, mode: "insensitive" } },
        { user: { fullName: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
      ],
    });
  const where = filters.length > 1 ? { AND: filters } : baseWhere;

  const [apps, grouped, unreadMessages] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
      include: { user: true, lawyer: true },
    }),
    prisma.application.groupBy({ by: ["status"], _count: { _all: true }, where: baseWhere }),
    isLawyer ? Promise.resolve(0) : unreadTeamCount(),
  ]);

  const counts: Record<string, number> = {};
  for (const g of grouped) counts[g.status] = g._count._all;

  const statCards = (isLawyer
    ? ["VALIDATED", "WITH_LAWYER", "IN_PROCESSING"]
    : ["SUBMITTED", "UNDER_REVIEW", "VALIDATED", "WITH_LAWYER"]
  ).map((k) => ({ key: k, label: STATUS_LABEL[k] }));

  const heading = q
    ? `Search: “${q}”`
    : statusFilter
    ? STATUS_LABEL[statusFilter]
    : isLawyer
    ? t.admin.lawyerTitle
    : t.admin.reviewTitle;

  return (
    <>
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-ink-900">{heading}</h1>
        {(statusFilter || q) && (
          <Link href="/admin" className="text-sm text-ink-400 hover:text-ink-700">
            Clear
          </Link>
        )}
      </div>

      {!q && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCards.map((s) => (
            <Link
              key={s.key}
              href={`/admin?status=${s.key}`}
              className={`rounded-xl bg-white px-4 py-3 transition hover:shadow-soft ${
                statusFilter === s.key ? "ring-2 ring-brand-400" : "border border-ink-200"
              }`}
            >
              <div className="text-2xl font-bold text-ink-900">{counts[s.key] || 0}</div>
              <div className="text-xs text-ink-500">{s.label}</div>
            </Link>
          ))}
        </div>
      )}

      <div className="card mt-6 overflow-hidden">
        {apps.length === 0 ? (
          <div className="px-6 py-16 text-center text-ink-400">
            {q ? `No applications match “${q}”.` : t.admin.empty}
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
              <tr>
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
                  <td className="px-5 py-4">
                    <div className="font-semibold text-ink-900">{a.user.fullName}</div>
                    <div className="text-xs text-ink-400">{a.user.email}</div>
                    <div className="font-mono text-xs text-ink-400">{a.reference}</div>
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

      {!isLawyer && !q && (
        <Link
          href="/admin/messages"
          className="card mt-6 flex items-center justify-between p-5 transition hover:shadow-card"
        >
          <div>
            <h2 className="text-base font-bold text-ink-900">Messages from users</h2>
            <p className="mt-1 text-sm text-ink-500">
              Open the chat to reply to applicants — text, voice notes and documents.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {unreadMessages > 0 && (
              <span className="rounded-full bg-brand-600 px-2.5 py-1 text-sm font-bold text-white">
                {unreadMessages} new
              </span>
            )}
            <span className="text-brand-600">→</span>
          </div>
        </Link>
      )}
    </>
  );
}
