import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
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
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const user = await prisma.user.create({
    data: {
      email,
      fullName,
      phone,
      passwordHash: await hashPassword(password),
      role: "APPLICANT",
    },
  });

  await createSession({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role as "APPLICANT",
  });

  return NextResponse.json({ ok: true });
}
