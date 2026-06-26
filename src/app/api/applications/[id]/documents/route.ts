import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ALLOWED_MIME, MAX_UPLOAD_BYTES, saveFile, sniffMime } from "@/lib/storage";
import { requiredDocsForProgram } from "@/lib/documents";

async function canAccess(appId: string, userId: string, role: string) {
  const app = await prisma.application.findUnique({ where: { id: appId } });
  if (!app) return null;
  const isStaff = role === "ADMIN" || role === "LAWYER";
  if (app.userId !== userId && !isStaff) return null;
  return app;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const app = await canAccess(params.id, user.id, user.role);
  if (!app) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const docs = await prisma.document.findMany({
    where: { applicationId: params.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      category: true,
      originalName: true,
      mimeType: true,
      size: true,
      aiStatus: true,
      aiVerdict: true,
      aiResult: true,
      reviewStatus: true,
      reviewNote: true,
      createdAt: true,
    },
  });

  // Required-document checklist + saved per-category AI completeness.
  const requirements = requiredDocsForProgram(app.program);
  let checks: Record<string, any> = {};
  try {
    checks = app.docChecks ? JSON.parse(app.docChecks) : {};
  } catch {
    checks = {};
  }

  return NextResponse.json({ documents: docs, requirements, checks });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const app = await canAccess(params.id, user.id, user.role);
  if (!app) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (app.status === "WITHDRAWN") {
    return NextResponse.json({ error: "This application has been withdrawn." }, { status: 409 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const category = String(form?.get("category") || "Other");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!ALLOWED_MIME[file.type]) {
    return NextResponse.json({ error: "Only PDF, JPG or PNG files are allowed." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File is too large." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Trust the bytes, not the client-declared MIME: verify the file's real type.
  const realMime = sniffMime(buffer, file.type);
  if (!realMime) {
    return NextResponse.json(
      { error: "File content does not match an allowed type (PDF, JPG, PNG)." },
      { status: 400 }
    );
  }
  const ext = ALLOWED_MIME[realMime];
  const fileName = `${randomUUID()}.${ext}`;

  let storedName: string;
  try {
    // In production this returns a Blob URL; in dev it returns the local filename.
    storedName = await saveFile(params.id, fileName, buffer, realMime);
  } catch (e: any) {
    console.error("[upload] saveFile failed:", e);
    const msg = process.env.BLOB_READ_WRITE_TOKEN
      ? `Could not store the file: ${e?.message || "storage error"}`
      : "File storage is not configured. Connect a Vercel Blob store and redeploy.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const doc = await prisma.document.create({
    data: {
      applicationId: params.id,
      uploadedById: user.id,
      category,
      originalName: file.name.slice(0, 200),
      storedName,
      mimeType: realMime,
      size: file.size,
    },
  });

  await prisma.applicationEvent.create({
    data: {
      applicationId: params.id,
      type: "SYSTEM",
      message: `Document uploaded: ${category} (${file.name.slice(0, 80)}).`,
      actor: user.fullName,
    },
  });

  return NextResponse.json({ id: doc.id });
}
