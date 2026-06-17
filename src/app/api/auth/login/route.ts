import { NextResponse } from "next/server";
import { authenticate, createSession } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = (body?.email || "").trim().toLowerCase();
  const password = body?.password || "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await authenticate(email, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await createSession({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role as "APPLICANT" | "ADMIN" | "LAWYER",
  });

  return NextResponse.json({ ok: true, role: user.role });
}
