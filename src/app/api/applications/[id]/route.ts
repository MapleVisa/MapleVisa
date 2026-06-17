import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { deleteAppFiles } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const app = await prisma.application.findUnique({
    where: { id: params.id },
    include: { events: { orderBy: { createdAt: "desc" } }, user: true, lawyer: true },
  });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isStaff = user.role === "ADMIN" || user.role === "LAWYER";
  if (app.userId !== user.id && !isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    application: {
      id: app.id,
      reference: app.reference,
      program: app.program,
      status: app.status,
      data: JSON.parse(app.data || "{}"),
      currentStep: app.currentStep,
      reviewNote: app.reviewNote,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      submittedAt: app.submittedAt,
      owner: { fullName: app.user.fullName, email: app.user.email, phone: app.user.phone },
      lawyer: app.lawyer ? { fullName: app.lawyer.fullName, email: app.lawyer.email } : null,
      events: app.events,
    },
  });
}

// Save draft data / current step. Owner only, and only while editable.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const app = await prisma.application.findUnique({ where: { id: params.id } });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (app.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!["DRAFT", "NEEDS_INFO"].includes(app.status)) {
    return NextResponse.json(
      { error: "This application can no longer be edited." },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => null);
  const data: Record<string, any> = {};
  if (body?.data && typeof body.data === "object") data.data = JSON.stringify(body.data);
  if (typeof body?.currentStep === "number") data.currentStep = body.currentStep;

  await prisma.application.update({ where: { id: app.id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const app = await prisma.application.findUnique({ where: { id: params.id } });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (app.userId !== user.id || app.status !== "DRAFT") {
    return NextResponse.json({ error: "Only your drafts can be deleted." }, { status: 403 });
  }

  // Cascade removes the document/event rows; also remove the uploaded files.
  await prisma.application.delete({ where: { id: app.id } });
  await deleteAppFiles(app.id);
  return NextResponse.json({ ok: true });
}
