import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { validateApplication } from "@/lib/applications";
import { getLocale } from "@/i18n";
import { localizeStrings } from "@/lib/i18n/programs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const app = await prisma.application.findUnique({ where: { id: params.id } });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (app.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!["DRAFT", "NEEDS_INFO"].includes(app.status)) {
    return NextResponse.json({ error: "Already submitted." }, { status: 409 });
  }

  // Allow the latest data to be sent with submit.
  const body = await req.json().catch(() => null);
  const data =
    body?.data && typeof body.data === "object"
      ? body.data
      : JSON.parse(app.data || "{}");

  const issues = validateApplication(app.program, data);
  if (issues.length) {
    // Translate section titles + missing field labels into the user's language.
    const locale = await getLocale();
    const localizedIssues = await Promise.all(
      issues.map(async (iss) => ({
        ...iss,
        sectionTitle: (await localizeStrings([iss.sectionTitle], locale))[0],
        missing: await localizeStrings(iss.missing, locale),
      }))
    );
    return NextResponse.json(
      { error: "Some required fields are missing.", issues: localizedIssues },
      { status: 422 }
    );
  }

  await prisma.application.update({
    where: { id: app.id },
    data: {
      data: JSON.stringify(data),
      status: "SUBMITTED",
      submittedAt: new Date(),
      events: {
        create: {
          type: "STATUS",
          message: "Application submitted for review.",
          actor: user.fullName,
        },
      },
    },
  });

  return NextResponse.json({ ok: true });
}
