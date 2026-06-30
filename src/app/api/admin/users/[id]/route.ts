import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";

const ROLES = ["APPLICANT", "LAWYER", "ADMIN"];

// Only the super-admin may change roles (including removing other admins).
// Other admins cannot change anyone's role.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: "Only the owner can change roles." }, { status: 403 });
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
