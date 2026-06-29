import { NextResponse } from "next/server";
import { authenticate, createSession } from "@/lib/auth";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = (body?.email || "").trim().toLowerCase();
  const password = body?.password || "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  // Throttle brute-force attempts: by IP (10/min) and per-email (5/5min).
  const ip = clientIp(req);
  const byIp = await rateLimit(`login:ip:${ip}`, 10, 60);
  if (!byIp.ok) return tooMany(byIp.retryAfter);
  const byEmail = await rateLimit(`login:email:${email}`, 5, 300);
  if (!byEmail.ok) return tooMany(byEmail.retryAfter);

  const user = await authenticate(email, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  // Block sign-in until the email is verified.
  if (!user.emailVerified) {
    return NextResponse.json(
      { error: "Please verify your email before signing in. Check your inbox for the link.", code: "EMAIL_NOT_VERIFIED" },
      { status: 403 }
    );
  }

  await createSession({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role as "APPLICANT" | "ADMIN" | "LAWYER",
  });

  return NextResponse.json({ ok: true, role: user.role });
}
