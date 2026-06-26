import Link from "next/link";
import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import BackButton from "@/components/BackButton";
import FormWizard from "@/components/FormWizard";
import StatusBadge from "@/components/StatusBadge";
import StatusTracker from "@/components/StatusTracker";
import ApplicationSummary from "@/components/ApplicationSummary";
import Timeline from "@/components/Timeline";
import DocumentsPanel from "@/components/DocumentsPanel";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { localizeProgram } from "@/lib/i18n/programs";
import { STATUS_META, type AppStatus } from "@/lib/status";
import { getDictionary, getLocale } from "@/i18n";

export default async function ApplicationPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { submitted?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const app = await prisma.application.findUnique({
    where: { id: params.id },
    include: { events: { orderBy: { createdAt: "desc" } }, lawyer: true },
  });
  if (!app) redirect("/dashboard");
  if (app.userId !== user.id) {
    // Staff should use the admin view.
    redirect(user.role === "APPLICANT" ? "/dashboard" : `/admin/${app.id}`);
  }

  const locale = await getLocale();
  const prog = (await localizeProgram(app.program, locale))!;
  const data = JSON.parse(app.data || "{}");
  const editable = ["DRAFT", "NEEDS_INFO"].includes(app.status);
  const t = await getDictionary(locale);
  const maxMb = Number(process.env.MAX_UPLOAD_MB) || 10;

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <BackButton href="/dashboard" />
        <div className="mb-6 flex items-center gap-2 text-sm text-ink-400">
          <Link href="/dashboard" className="hover:text-ink-600">
            {t.wizard.breadcrumb}
          </Link>
          <span>/</span>
          <span className="text-ink-600">{prog.name}</span>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-ink-900">{prog.name}</h1>
              <StatusBadge status={app.status} />
            </div>
            <p className="mt-1 text-sm text-ink-500">{t.dashboard.ref} {app.reference}</p>
          </div>
        </div>

        {searchParams.submitted && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-semibold">{t.wizard.submittedTitle}</p>
            <p className="mt-1">{t.wizard.submittedDesc}</p>
          </div>
        )}

        {editable ? (
          <div className="space-y-8">
            <FormWizard
              applicationId={app.id}
              program={app.program}
              sections={prog.sections}
              reference={app.reference}
              initialData={data}
              initialStep={app.currentStep}
              reviewNote={app.status === "NEEDS_INFO" ? app.reviewNote : null}
            />
            <DocumentsPanel applicationId={app.id} canUpload isStaff={false} maxMb={maxMb} />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="card p-6">
              <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-400">
                {t.wizard.progress}
              </h2>
              <p className="mb-6 text-sm text-ink-500">
                {STATUS_META[app.status as AppStatus]?.description}
              </p>
              <StatusTracker status={app.status} />
            </div>

            {app.lawyer && (
              <div className="card flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-xl">
                  ⚖️
                </div>
                <div>
                  <p className="text-sm text-ink-500">{t.wizard.assignedLawyer}</p>
                  <p className="font-semibold text-ink-900">{app.lawyer.fullName}</p>
                </div>
              </div>
            )}

            {app.status !== "WITHDRAWN" && (
              <DocumentsPanel applicationId={app.id} canUpload isStaff={false} maxMb={maxMb} />
            )}

            <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
              <div>
                <h2 className="mb-3 text-lg font-bold text-ink-900">{t.wizard.yourDetails}</h2>
                <ApplicationSummary program={app.program} data={data} />
              </div>
              <aside className="lg:sticky lg:top-20 lg:self-start">
                <div className="card p-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">
                    {t.wizard.activity}
                  </h3>
                  <div className="mt-4">
                    <Timeline events={app.events} />
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
