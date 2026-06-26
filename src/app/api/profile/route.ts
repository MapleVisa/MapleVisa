import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, createSession } from "@/lib/auth";

// Update the signed-in user's profile (name, email, phone, address).
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const fullName = String(body?.fullName || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const phone = String(body?.phone || "").trim() || null;
  const address = String(body?.address || "").trim() || null;

  if (!fullName) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  // If the email changed, make sure it's not taken by another account.
  if (email !== user.email.toLowerCase()) {
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing && existing.id !== user.id) {
      return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { fullName, email, phone, address },
    select: { id: true, email: true, fullName: true, role: true },
  });

  // Refresh the session so the header/name reflect the new values immediately.
  await createSession({
    id: updated.id,
    email: updated.email,
    fullName: updated.fullName,
    role: updated.role as "APPLICANT" | "ADMIN" | "LAWYER",
  });

  return NextResponse.json({ ok: true });
}
