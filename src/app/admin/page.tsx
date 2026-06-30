import Link from "next/link";
import { redirect } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import DeleteApplicationButton from "@/components/DeleteApplicationButton";
import { getCurrentUser } from "@/lib/auth";
import { getAbilities } from "@/lib/permissions";
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
  searchParams: { status?: string; q?: string; view?: string };
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
  const isAdmin = user.role === "ADMIN";
  const canDelete = isAdmin && (await getAbilities(user)).has("delete");
  const q = (searchParams?.q || "").trim();
  // Lawyers only see cases assigned to them, split into active vs completed.
  const lawyerView = searchParams?.view === "completed" ? "completed" : "mine";
  const statusFilter =
    !isLawyer && searchParams?.status && STATUS_LABEL[searchParams.status] ? searchParams.status : null;

  const LAWYER_ACTIVE = ["WITH_LAWYER", "IN_PROCESSING"];
  const LAWYER_DONE = ["APPROVED", "REJECTED"];

  const baseWhere: any = isLawyer ? { lawyerId: user.id } : { status: { not: "DRAFT" } };

  const filters: any[] = [baseWhere];
  if (isLawyer) {
    filters.push({ status: { in: lawyerView === "completed" ? LAWYER_DONE : LAWYER_ACTIVE } });
  } else if (statusFilter) {
    filters.push({ status: statusFilter });
  }
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
  const lawyerMine = (counts.WITH_LAWYER || 0) + (counts.IN_PROCESSING || 0);
  const lawyerDone = (counts.APPROVED || 0) + (counts.REJECTED || 0);

  const statCards = isLawyer
    ? [
        { key: "mine", label: "My cases", count: lawyerMine, href: "/admin", active: lawyerView === "mine" },
        { key: "completed", label: "Completed cases", count: lawyerDone, href: "/admin?view=completed", active: lawyerView === "completed" },
      ]
    : ["SUBMITTED", "UNDER_REVIEW", "VALIDATED", "WITH_LAWYER"].map((k) => ({
        key: k,
        label: STATUS_LABEL[k],
        count: counts[k] || 0,
        href: `/admin?status=${k}`,
        active: statusFilter === k,
      }));

  const heading = q
    ? `Search: “${q}”`
    : isLawyer
    ? lawyerView === "completed"
      ? "Completed cases"
      : "My cases"
    : statusFilter
    ? STATUS_LABEL[statusFilter]
    : t.admin.reviewTitle;

  const showClear = !!q || !!statusFilter || (isLawyer && lawyerView === "completed");

  return (
    <>
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-ink-900">{heading}</h1>
        {showClear && (
          <Link href="/admin" className="text-sm text-ink-400 hover:text-ink-700">
            Clear
          </Link>
        )}
      </div>

      {!q && (
        <div className={`mt-5 grid grid-cols-2 gap-3 ${isLawyer ? "" : "sm:grid-cols-4"}`}>
          {statCards.map((s) => (
            <Link
              key={s.key}
              href={s.href}
              className={`rounded-xl bg-white px-4 py-3 transition hover:shadow-soft ${
                s.active ? "ring-2 ring-brand-400" : "border border-ink-200"
              }`}
            >
              <div className="text-2xl font-bold text-ink-900">{s.count}</div>
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
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
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
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/${a.id}`} className="font-semibold text-brand-600 hover:underline">
                        {t.admin.open}
                      </Link>
                      {canDelete && (
                        <DeleteApplicationButton
                          id={a.id}
                          reference={a.reference}
                          label="Delete"
                          className="text-sm font-semibold text-ink-400 hover:text-brand-600"
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
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
