import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import { createToken } from "@/lib/tokens";
import { sendResetEmail, baseUrl } from "@/lib/email";

// Request a password reset. Always responds ok so we never reveal whether an
// account exists for the given email.
export async function POST(req: Request) {
  const limit = await rateLimit(`forgot:ip:${clientIp(req)}`, 5, 3600);
  if (!limit.ok) return tooMany(limit.retryAfter);

  const body = await req.json().catch(() => null);
  const email = (body?.email || "").trim().toLowerCase();
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = await createToken(user.id, "RESET");
      await sendResetEmail(user.email, `${baseUrl(req)}/reset?token=${token}`);
    }
  }
  return NextResponse.json({ ok: true });
}
