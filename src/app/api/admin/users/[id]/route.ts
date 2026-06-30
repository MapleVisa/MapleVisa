import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { ALL_ABILITIES } from "@/lib/permissions";

const ROLES = ["APPLICANT", "LAWYER", "ADMIN"];

// Only the super-admin may change a user's role or grant admin abilities.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: "Only the owner can manage roles and abilities." }, { status: 403 });
  }
  if (params.id === user.id) {
    return NextResponse.json({ error: "You can't change your own role or abilities." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const body = await req.json().catch(() => null);

  // Grant/revoke admin abilities.
  if (Array.isArray(body?.permissions)) {
    const perms = body.permissions.filter((k: unknown) => (ALL_ABILITIES as string[]).includes(k as string));
    await prisma.user.update({ where: { id: target.id }, data: { permissions: JSON.stringify(perms) } });
    return NextResponse.json({ ok: true, permissions: perms });
  }

  // Change role.
  const role = String(body?.role || "");
  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }
  await prisma.user.update({ where: { id: target.id }, data: { role } });
  return NextResponse.json({ ok: true, role });
}
