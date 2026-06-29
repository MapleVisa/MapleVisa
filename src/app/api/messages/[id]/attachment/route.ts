import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMessageForAttachment } from "@/lib/messages";
import { readFile } from "@/lib/storage";

// Stream a message attachment (voice note or document) to an authorized viewer:
// the sender, the recipient, or any staff member.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const msg = await getMessageForAttachment(params.id);
  if (!msg || !msg.attachmentKey) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isStaff = user.role === "ADMIN" || user.role === "LAWYER";
  const isParticipant = msg.fromUserId === user.id || msg.toUserId === user.id;
  // Applicant messages to the team have toUserId = null; staff may view those.
  if (!isParticipant && !isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const buf = await readFile("messages", msg.attachmentKey);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": msg.attachmentMime || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(msg.attachmentName || "attachment")}"`,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
}
