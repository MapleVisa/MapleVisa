import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ALLOWED_MIME, MAX_UPLOAD_BYTES, saveFile } from "@/lib/storage";

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
  return NextResponse.json({ documents: docs });
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
  const ext = ALLOWED_MIME[file.type];
  const storedName = `${randomUUID()}.${ext}`;
  await saveFile(params.id, storedName, buffer);

  const doc = await prisma.document.create({
    data: {
      applicationId: params.id,
      uploadedById: user.id,
      category,
      originalName: file.name.slice(0, 200),
      storedName,
      mimeType: file.type,
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
