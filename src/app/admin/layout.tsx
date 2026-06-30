import { redirect } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { ALL_ABILITIES, parsePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { unreadTeamCount } from "@/lib/messages";

// Shared chrome for the whole staff area: the icon rail + sidebar + top bar
// stay mounted while only the page content (children) changes.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN" && user.role !== "LAWYER") redirect("/dashboard");

  const isLawyer = user.role === "LAWYER";
  // Lawyers only see their own assigned cases.
  const baseWhere: any = isLawyer ? { lawyerId: user.id } : { status: { not: "DRAFT" } };

  const [dbUser, grouped, unread] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { avatarKey: true, permissions: true } }),
    prisma.application.groupBy({ by: ["status"], _count: { _all: true }, where: baseWhere }),
    isLawyer ? Promise.resolve(0) : unreadTeamCount(),
  ]);

  const counts: Record<string, number> = {};
  if (isLawyer) {
    const byStatus: Record<string, number> = {};
    for (const g of grouped) byStatus[g.status] = g._count._all;
    counts.mine = (byStatus.WITH_LAWYER || 0) + (byStatus.IN_PROCESSING || 0);
    counts.completed = (byStatus.APPROVED || 0) + (byStatus.REJECTED || 0);
  } else {
    for (const g of grouped) counts[g.status] = g._count._all;
  }

  const abilities: string[] = isSuperAdmin(user.email)
    ? [...ALL_ABILITIES]
    : user.role === "ADMIN"
    ? parsePermissions(dbUser?.permissions)
    : [];

  return (
    <AdminShell user={user} avatarKey={dbUser?.avatarKey} counts={counts} unread={unread} abilities={abilities}>
      {children}
    </AdminShell>
  );
}
