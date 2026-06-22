import Link from "next/link";
import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ROLE_LABEL: Record<string, string> = {
  APPLICANT: "Applicant",
  ADMIN: "Case officer",
  LAWYER: "Lawyer",
};

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/admin");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      _count: { select: { applications: true } },
    },
  });

  const fmtDate = (d: Date) =>
    new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-ink-900">Users</h1>
        <p className="mt-1 text-ink-500">
          Everyone registered on the portal. Click a name to view their profile, applications, and
          message history.
        </p>

        <div className="card mt-8 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Applications</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-ink-50/60">
                  <td className="px-5 py-4">
                    <Link href={`/admin/users/${u.id}`} className="font-semibold text-brand-600 hover:underline">
                      {u.fullName}
                    </Link>
                    {u.phone && <div className="text-xs text-ink-400">{u.phone}</div>}
                  </td>
                  <td className="px-5 py-4 text-ink-600">{u.email}</td>
                  <td className="px-5 py-4 text-ink-700">{ROLE_LABEL[u.role] ?? u.role}</td>
                  <td className="px-5 py-4 text-ink-700">{u._count.applications}</td>
                  <td className="px-5 py-4 text-xs text-ink-500">{fmtDate(u.createdAt)}</td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/users/${u.id}#message`}
                      className="font-semibold text-brand-600 hover:underline"
                    >
                      Email
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
