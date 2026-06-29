import Link from "next/link";
import { redirect } from "next/navigation";
import BackButton from "@/components/BackButton";
import StatusBadge from "@/components/StatusBadge";
import ApplicationSummary from "@/components/ApplicationSummary";
import Timeline from "@/components/Timeline";
import CaseActions from "@/components/CaseActions";
import CaseAssistant from "@/components/ai/CaseAssistant";
import DocumentsPanel from "@/components/DocumentsPanel";
import AcceptAndAssign from "@/components/AcceptAndAssign";
import MessageComposer from "@/components/MessageComposer";
import MessageList from "@/components/MessageList";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { localizeProgram } from "@/lib/i18n/programs";
import { getLocale } from "@/i18n";
import { validateApplication } from "@/lib/applications";
import { requiredDocsForProgram } from "@/lib/documents";
import { listMessagesForApplication } from "@/lib/messages";

export default async function AdminCasePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN" && user.role !== "LAWYER") redirect("/dashboard");

  const app = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      events: { orderBy: { createdAt: "desc" } },
      user: true,
      lawyer: true,
    },
  });
  if (!app) redirect("/admin");

  const locale = await getLocale();
  const prog = (await localizeProgram(app.program, locale))!;
  const data = JSON.parse(app.data || "{}");
  const issues = validateApplication(app.program, data);
  const maxMb = Number(process.env.MAX_UPLOAD_MB) || 10;

  const isAdmin = user.role === "ADMIN";
  const messages = await listMessagesForApplication(app.id);

  // Application-level readiness: every required field complete and every required
  // document category assessed by AI as complete (green ≥ 80%).
  const reqDocs = requiredDocsForProgram(app.program);
  let docChecks: Record<string, any> = {};
  try {
    docChecks = app.docChecks ? JSON.parse(app.docChecks) : {};
  } catch {
    docChecks = {};
  }
  const docsTotal = reqDocs.length;
  const docsDone = reqDocs.filter((r) => docChecks[r.category]?.status === "green").length;
  const docsRejected = reqDocs.filter(
    (r) => !docChecks[r.category] || docChecks[r.category]?.status === "red"
  ).length;
  const validationOk = issues.length === 0;
  const readiness = {
    validationOk,
    docsTotal,
    docsDone,
    docsRejected,
    ready: validationOk && docsTotal > 0 && docsDone === docsTotal,
  };

  return (
    <>
        <BackButton href="/admin" />
        <div className="mb-6 flex items-center gap-2 text-sm text-ink-400">
          <Link href="/admin" className="hover:text-ink-600">
            Review queue
          </Link>
          <span>/</span>
          <span className="text-ink-600">{app.reference}</span>
        </div>

        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-ink-900">{prog.name}</h1>
              <StatusBadge status={app.status} />
            </div>
            <p className="mt-1 text-sm text-ink-500">
              {app.user.fullName} · {app.user.email}
              {app.user.phone ? ` · ${app.user.phone}` : ""} · Ref {app.reference}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Left: data + documents */}
          <div className="space-y-6">
            <ApplicationSummary program={app.program} data={data} />
            {app.status !== "WITHDRAWN" && (
              <DocumentsPanel applicationId={app.id} canUpload isStaff maxMb={maxMb} />
            )}

            <div className="card p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">
                Messages with applicant
              </h3>
              <div className="mt-4">
                <MessageList messages={messages} viewerIsStaff emptyText="No messages with this applicant yet." />
              </div>
            </div>
            <MessageComposer
              toUserId={app.userId}
              applicationId={app.id}
              title="Message the applicant"
              placeholder="Inform the applicant about their case, request something, or share an update…"
            />
          </div>

          {/* Right: actions + AI + validation + timeline */}
          <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
            {isAdmin && <AcceptAndAssign id={app.id} status={app.status} readiness={readiness} />}
            <CaseActions id={app.id} role={user.role as "ADMIN" | "LAWYER"} status={app.status} />
            <CaseAssistant applicationId={app.id} />

            <div className="card p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">
                Validation check
              </h3>
              {issues.length === 0 ? (
                <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  ✓ All required fields are complete.
                </p>
              ) : (
                <div className="mt-3">
                  <p className="text-sm text-amber-700">
                    {issues.length} section{issues.length > 1 ? "s" : ""} with missing required
                    fields:
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-ink-500">
                    {issues.map((iss) => (
                      <li key={iss.sectionId}>
                        <span className="font-semibold text-ink-700">{iss.sectionTitle}:</span>{" "}
                        {iss.missing.join(", ")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="card p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">
                Case timeline
              </h3>
              <div className="mt-4">
                <Timeline events={app.events} />
              </div>
            </div>
          </aside>
        </div>
    </>
  );
}
