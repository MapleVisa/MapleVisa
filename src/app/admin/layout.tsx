import { redirect } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { unreadTeamCount } from "@/lib/messages";

// Shared chrome for the whole staff area: the icon rail + sidebar + top bar
// stay mounted while only the page content (children) changes.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN" && user.role !== "LAWYER") redirect("/dashboard");

  const isLawyer = user.role === "LAWYER";
  const baseWhere: any = isLawyer
    ? { OR: [{ lawyerId: user.id }, { status: { in: ["VALIDATED", "WITH_LAWYER", "IN_PROCESSING"] } }] }
    : { status: { not: "DRAFT" } };

  const [dbUser, grouped, unread] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { avatarKey: true } }),
    prisma.application.groupBy({ by: ["status"], _count: { _all: true }, where: baseWhere }),
    isLawyer ? Promise.resolve(0) : unreadTeamCount(),
  ]);

  const counts: Record<string, number> = {};
  for (const g of grouped) counts[g.status] = g._count._all;

  return (
    <AdminShell user={user} avatarKey={dbUser?.avatarKey} counts={counts} unread={unread}>
      {children}
    </AdminShell>
  );
}
