import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const ROLES = ["APPLICANT", "LAWYER", "ADMIN"];

// Admin-only: change a user's role. Admins cannot change their own role (so they
// can't accidentally lock themselves out of the admin area).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (params.id === user.id) {
    return NextResponse.json({ error: "You can't change your own role." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const role = String(body?.role || "");
  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  await prisma.user.update({ where: { id: params.id }, data: { role } });
  return NextResponse.json({ ok: true, role });
}
