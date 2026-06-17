import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canWithdraw } from "@/lib/status";
import { deleteAppFiles } from "@/lib/storage";

// POST /api/applications/[id]/withdraw — the applicant withdraws their own
// application. Allowed for any submitted, non-terminal application.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const app = await prisma.application.findUnique({ where: { id: params.id } });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (app.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!canWithdraw(app.status)) {
    return NextResponse.json(
      { error: "This application can no longer be withdrawn." },
      { status: 409 }
    );
  }

  // A withdrawn application needs no further documents or review notes — remove
  // the uploaded documents (DB rows + files) and clear the review note.
  await prisma.document.deleteMany({ where: { applicationId: app.id } });
  await prisma.application.update({
    where: { id: app.id },
    data: {
      status: "WITHDRAWN",
      reviewNote: null,
      events: {
        create: {
          type: "STATUS",
          message: "Application withdrawn by the applicant.",
          actor: user.fullName,
        },
      },
    },
  });
  await deleteAppFiles(app.id);

  return NextResponse.json({ ok: true });
}
