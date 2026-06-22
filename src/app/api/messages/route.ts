import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sendMessage, listInboxFor, listTeamInbox } from "@/lib/messages";
import { rateLimit, tooMany } from "@/lib/rate-limit";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isStaff = user.role === "ADMIN" || user.role === "LAWYER";
  const messages = isStaff ? await listTeamInbox() : await listInboxFor(user.id);
  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Throttle to curb spam: 20 messages / 5 min per user.
  const limit = await rateLimit(`msg:${user.id}`, 20, 300);
  if (!limit.ok) return tooMany(limit.retryAfter);

  const body = await req.json().catch(() => null);
  const text = String(body?.body || "").trim();
  const subject = typeof body?.subject === "string" ? body.subject : null;
  let applicationId: string | null = typeof body?.applicationId === "string" ? body.applicationId : null;

  if (!text) return NextResponse.json({ error: "Message body is required." }, { status: 400 });
  if (text.length > 5000) return NextResponse.json({ error: "Message is too long." }, { status: 400 });

  const isStaff = user.role === "ADMIN" || user.role === "LAWYER";
  let toUserId: string | null = null;

  if (isStaff) {
    // Staff message a specific user (the applicant).
    toUserId = typeof body?.toUserId === "string" ? body.toUserId : null;
    if (!toUserId) {
      return NextResponse.json({ error: "A recipient is required." }, { status: 400 });
    }
    const recipient = await prisma.user.findUnique({ where: { id: toUserId }, select: { id: true } });
    if (!recipient) return NextResponse.json({ error: "Recipient not found." }, { status: 404 });
  } else {
    // Applicants can only write to the staff team inbox.
    toUserId = null;
    // If an application is referenced, it must belong to the applicant.
    if (applicationId) {
      const owned = await prisma.application.findFirst({
        where: { id: applicationId, userId: user.id },
        select: { id: true },
      });
      if (!owned) applicationId = null;
    }
  }

  const message = await sendMessage({
    fromUserId: user.id,
    toUserId,
    applicationId,
    subject,
    body: text,
  });

  return NextResponse.json({ message });
}
