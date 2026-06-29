import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sendMessage, listThread, markThreadRead } from "@/lib/messages";
import { saveFile, MAX_UPLOAD_BYTES } from "@/lib/storage";
import { rateLimit, tooMany } from "@/lib/rate-limit";

// Attachment types allowed in chat (voice notes + documents/images).
const CHAT_MIME_EXT: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

// GET: applicant -> own thread; staff -> ?with=<applicantId> thread.
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const isStaff = user.role === "ADMIN" || user.role === "LAWYER";

  const withId = new URL(req.url).searchParams.get("with");
  const applicantId = isStaff ? withId : user.id;
  if (!applicantId) return NextResponse.json({ messages: [] });

  const messages = await listThread(applicantId);
  await markThreadRead(applicantId, isStaff);
  return NextResponse.json({ messages, me: user.id });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = await rateLimit(`msg:${user.id}`, 40, 300);
  if (!limit.ok) return tooMany(limit.retryAfter);

  const isStaff = user.role === "ADMIN" || user.role === "LAWYER";
  const ctype = req.headers.get("content-type") || "";

  let body = "";
  let kind = "TEXT";
  let toUserIdRaw: string | null = null;
  let applicationId: string | null = null;
  let durationSec: number | null = null;
  let file: File | null = null;

  if (ctype.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: "Invalid form." }, { status: 400 });
    body = String(form.get("body") || "");
    kind = String(form.get("kind") || "TEXT");
    toUserIdRaw = (form.get("toUserId") as string) || null;
    applicationId = (form.get("applicationId") as string) || null;
    const d = Number(form.get("durationSec"));
    durationSec = Number.isFinite(d) && d > 0 ? Math.round(d) : null;
    const f = form.get("file");
    if (f instanceof File) file = f;
  } else {
    const json = await req.json().catch(() => null);
    body = String(json?.body || "");
    toUserIdRaw = typeof json?.toUserId === "string" ? json.toUserId : null;
    applicationId = typeof json?.applicationId === "string" ? json.applicationId : null;
  }

  // Resolve recipient: staff message a specific applicant; applicants -> team.
  let toUserId: string | null = null;
  if (isStaff) {
    toUserId = toUserIdRaw;
    if (!toUserId) return NextResponse.json({ error: "A recipient is required." }, { status: 400 });
    const recipient = await prisma.user.findUnique({ where: { id: toUserId }, select: { id: true } });
    if (!recipient) return NextResponse.json({ error: "Recipient not found." }, { status: 404 });
  } else {
    toUserId = null;
    if (applicationId) {
      const owned = await prisma.application.findFirst({
        where: { id: applicationId, userId: user.id },
        select: { id: true },
      });
      if (!owned) applicationId = null;
    }
  }

  // Handle an attachment (voice note or document).
  let attachment: {
    key: string;
    name: string;
    mime: string;
    size: number;
  } | null = null;

  if (file) {
    const ext = CHAT_MIME_EXT[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: "Unsupported file type. Allowed: images, PDF, and audio." },
        { status: 400 }
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File is too large." }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const storedName = await saveFile("messages", `${randomUUID()}.${ext}`, buffer, file.type);
    attachment = {
      key: storedName,
      name: file.name?.slice(0, 200) || (kind === "VOICE" ? "Voice message" : `file.${ext}`),
      mime: file.type,
      size: file.size,
    };
    if (kind !== "VOICE") kind = "FILE";
  }

  if (!body.trim() && !attachment) {
    return NextResponse.json({ error: "Empty message." }, { status: 400 });
  }
  if (body.length > 5000) return NextResponse.json({ error: "Message is too long." }, { status: 400 });

  const message = await sendMessage({
    fromUserId: user.id,
    toUserId,
    applicationId,
    body,
    kind: attachment ? kind : "TEXT",
    attachmentKey: attachment?.key ?? null,
    attachmentName: attachment?.name ?? null,
    attachmentMime: attachment?.mime ?? null,
    attachmentSize: attachment?.size ?? null,
    durationSec,
  });

  return NextResponse.json({ message });
}
