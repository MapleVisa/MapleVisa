import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import { createToken } from "@/lib/tokens";
import { sendVerificationEmail, baseUrl } from "@/lib/email";

// This email is granted ADMIN automatically and skips email verification.
const AUTO_ADMIN_EMAIL = "h.izadian1397@gmail.com";

export async function POST(req: Request) {
  const limit = await rateLimit(`signup:ip:${clientIp(req)}`, 5, 3600);
  if (!limit.ok) return tooMany(limit.retryAfter);

  const body = await req.json().catch(() => null);
  const fullName = (body?.fullName || "").trim();
  const email = (body?.email || "").trim().toLowerCase();
  const password = body?.password || "";
  const phone = (body?.phone || "").trim() || null;

  if (!fullName || !email || !password) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const isAutoAdmin = email === AUTO_ADMIN_EMAIL;
  const user = await prisma.user.create({
    data: {
      email,
      fullName,
      phone,
      passwordHash: await hashPassword(password),
      role: isAutoAdmin ? "ADMIN" : "APPLICANT",
      emailVerified: isAutoAdmin ? new Date() : null,
    },
  });

  // The auto-admin is trusted: log them in immediately, no verification.
  if (isAutoAdmin) {
    await createSession({ id: user.id, email: user.email, fullName: user.fullName, role: "ADMIN" });
    return NextResponse.json({ ok: true, role: "ADMIN" });
  }

  // Everyone else must verify their email before logging in.
  const token = await createToken(user.id, "VERIFY");
  await sendVerificationEmail(user.email, `${baseUrl(req)}/api/auth/verify?token=${token}`);
  return NextResponse.json({ ok: true, verify: true });
}
