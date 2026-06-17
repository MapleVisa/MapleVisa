import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const ALLOWED_STATUSES = [
  "UNDER_REVIEW",
  "NEEDS_INFO",
  "VALIDATED",
  "WITH_LAWYER",
  "IN_PROCESSING",
  "APPROVED",
  "REJECTED",
];

// Staff actions: change status, add a review note, assign a lawyer.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "LAWYER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const app = await prisma.application.findUnique({ where: { id: params.id } });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const updates: any = {};
  const events: { type: string; message: string; actor: string }[] = [];

  if (body?.status) {
    if (!ALLOWED_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    updates.status = body.status;
    events.push({
      type: "STATUS",
      message: `Status changed to ${body.status.replace(/_/g, " ").toLowerCase()}.`,
      actor: user.fullName,
    });
  }

  if (typeof body?.reviewNote === "string") {
    updates.reviewNote = body.reviewNote || null;
    if (body.reviewNote) {
      events.push({ type: "NOTE", message: body.reviewNote, actor: user.fullName });
    }
  }

  if (body?.assignLawyer === true) {
    // Assign to the first available lawyer (or self if the user is a lawyer).
    let lawyerId = user.role === "LAWYER" ? user.id : null;
    if (!lawyerId) {
      const lawyer = await prisma.user.findFirst({ where: { role: "LAWYER" } });
      lawyerId = lawyer?.id ?? null;
    }
    if (lawyerId) {
      updates.lawyerId = lawyerId;
      if (!updates.status) updates.status = "WITH_LAWYER";
      const lawyer = await prisma.user.findUnique({ where: { id: lawyerId } });
      events.push({
        type: "SYSTEM",
        message: `Case assigned to lawyer ${lawyer?.fullName ?? ""}.`,
        actor: user.fullName,
      });
    }
  }

  await prisma.application.update({
    where: { id: app.id },
    data: {
      ...updates,
      ...(events.length ? { events: { create: events } } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
