import Link from "next/link";
import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import StatusBadge from "@/components/StatusBadge";
import WithdrawButton from "@/components/WithdrawButton";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getProgram } from "@/lib/programs";
import { localizeProgramNames } from "@/lib/i18n/programs";
import { STATUS_META, canWithdraw, type AppStatus } from "@/lib/status";
import { getDictionary, getLocale } from "@/i18n";
import { fmt } from "@/i18n/load";
import WaveIcon from "@/components/WaveIcon";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "APPLICANT") redirect("/admin");

  const locale = await getLocale();
  const t = await getDictionary(locale);
  const programNames = await localizeProgramNames(locale);
  const formatDate = (d: Date | null) =>
    d ? new Date(d).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" }) : "—";

  const apps = await prisma.application.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  const firstName = user.fullName.split(" ")[0];

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-ink-900">
              <span>
                {t.dashboard.welcome}, {firstName}
              </span>
              <WaveIcon className="h-8 w-8 shrink-0" />
            </h1>
            <p className="mt-1 text-ink-500">{t.dashboard.manageSub}</p>
          </div>
          <Link href="/apply" className="btn-primary">
            {t.dashboard.startNewApp}
          </Link>
        </div>

        {apps.length === 0 ? (
          <div className="card mt-8 flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="text-4xl">🍁</div>
            <h2 className="mt-4 text-lg font-bold text-ink-900">{t.dashboard.noApps}</h2>
            <p className="mt-2 max-w-md text-ink-500">{t.dashboard.noAppsDesc}</p>
            <Link href="/apply" className="btn-primary mt-6">
              {t.dashboard.startFirst}
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {apps.map((app) => {
              const prog = getProgram(app.program);
              const meta = STATUS_META[app.status as AppStatus];
              const totalSteps = prog?.sections.length ?? 1;
              const editable = ["DRAFT", "NEEDS_INFO"].includes(app.status);
              const programName = programNames[app.program] ?? app.program;
              return (
                <div
                  key={app.id}
                  className="card flex flex-col gap-4 p-5 transition hover:shadow-card sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-2xl">
                      {prog?.icon ?? "📄"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-ink-900">{programName}</h3>
                        <StatusBadge status={app.status} />
                      </div>
                      <p className="mt-0.5 text-sm text-ink-500">
                        {t.dashboard.ref} {app.reference} · {t.dashboard.updated}{" "}
                        {formatDate(app.updatedAt)}
                      </p>
                      <p className="mt-1 text-sm text-ink-500">{meta?.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                    {editable && (
                      <span className="text-xs text-ink-400">
                        {fmt(t.dashboard.stepOf, {
                          a: Math.min(app.currentStep + 1, totalSteps),
                          b: totalSteps,
                        })}
                      </span>
                    )}
                    <Link
                      href={`/apply/${app.id}`}
                      className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-700"
                    >
                      {(editable ? t.dashboard.continue : t.dashboard.view).replace(/\s*→\s*$/, "")}
                    </Link>
                    {app.status === "DRAFT" ? (
                      <WithdrawButton applicationId={app.id} mode="delete" />
                    ) : (
                      canWithdraw(app.status) && <WithdrawButton applicationId={app.id} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
