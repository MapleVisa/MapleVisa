import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { readFile, deleteFile } from "@/lib/storage";

async function loadDoc(id: string) {
  return prisma.document.findUnique({ where: { id }, include: { application: true } });
}

// Download / inline view
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const doc = await loadDoc(params.id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isStaff = user.role === "ADMIN" || user.role === "LAWYER";
  if (doc.application.userId !== user.id && !isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const buf = await readFile(doc.applicationId, doc.storedName);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.originalName)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
}

// Staff review action
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "LAWYER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const doc = await loadDoc(params.id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const reviewStatus = body?.reviewStatus;
  if (!["PENDING", "ACCEPTED", "REJECTED"].includes(reviewStatus)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  await prisma.document.update({
    where: { id: doc.id },
    data: {
      reviewStatus,
      reviewNote: typeof body?.reviewNote === "string" ? body.reviewNote || null : doc.reviewNote,
      reviewedBy: user.fullName,
    },
  });
  return NextResponse.json({ ok: true });
}

// Delete (owner while editable, or staff)
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const doc = await loadDoc(params.id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isStaff = user.role === "ADMIN" || user.role === "LAWYER";
  const isOwner = doc.application.userId === user.id;
  if (!isStaff && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteFile(doc.applicationId, doc.storedName);
  await prisma.document.delete({ where: { id: doc.id } });
  return NextResponse.json({ ok: true });
}
