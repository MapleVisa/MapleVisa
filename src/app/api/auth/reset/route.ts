import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import { consumeToken } from "@/lib/tokens";

// Complete a password reset with a valid token.
export async function POST(req: Request) {
  const limit = await rateLimit(`reset:ip:${clientIp(req)}`, 10, 3600);
  if (!limit.ok) return tooMany(limit.retryAfter);

  const body = await req.json().catch(() => null);
  const token = String(body?.token || "");
  const password = String(body?.password || "");

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const userId = await consumeToken(token, "RESET");
  if (!userId) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  // Resetting via emailed link also proves email ownership → mark verified.
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password), emailVerified: new Date() },
  });
  return NextResponse.json({ ok: true });
}
