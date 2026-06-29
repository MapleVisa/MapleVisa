import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import { createToken } from "@/lib/tokens";
import { sendVerificationEmail, baseUrl } from "@/lib/email";

// Resend the email-verification link. Always responds ok (no account enumeration).
export async function POST(req: Request) {
  const limit = await rateLimit(`resend:ip:${clientIp(req)}`, 5, 3600);
  if (!limit.ok) return tooMany(limit.retryAfter);

  const body = await req.json().catch(() => null);
  const email = (body?.email || "").trim().toLowerCase();
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.emailVerified) {
      const token = await createToken(user.id, "VERIFY");
      await sendVerificationEmail(user.email, `${baseUrl(req)}/api/auth/verify?token=${token}`);
    }
  }
  return NextResponse.json({ ok: true });
}
