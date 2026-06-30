import Link from "next/link";
import { redirect } from "next/navigation";
import RoleSelect from "@/components/RoleSelect";
import AbilitiesEditor from "@/components/AbilitiesEditor";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { ADMIN_ABILITIES, parsePermissions, getAbilities } from "@/lib/permissions";
import { prisma } from "@/lib/db";

const ABILITY_LIST = ADMIN_ABILITIES.map((a) => ({ key: a.key, label: a.label, hint: a.hint }));

const ROLE_LABEL: Record<string, string> = {
  APPLICANT: "Applicant",
  ADMIN: "Case officer",
  LAWYER: "Lawyer",
};

// Role filter tabs (value -> label). `all` clears the role filter.
const ROLE_TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "APPLICANT", label: "Applicants" },
  { value: "LAWYER", label: "Lawyers" },
  { value: "ADMIN", label: "Admins" },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { role?: string; q?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/admin");
  if (!(await getAbilities(user)).has("users")) redirect("/admin");

  const canManageRoles = isSuperAdmin(user.email);
  const roleParam = searchParams.role && ROLE_LABEL[searchParams.role] ? searchParams.role : undefined;
  const q = (searchParams.q || "").trim();

  const users = await prisma.user.findMany({
    where: {
      id: { not: user.id }, // an admin never sees themselves
      ...(roleParam ? { role: roleParam } : {}),
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      permissions: true,
      createdAt: true,
      _count: { select: { applications: true } },
    },
  });

  const fmtDate = (d: Date) =>
    new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  // Build a tab href that preserves the current search query.
  const tabHref = (value: string) => {
    const sp = new URLSearchParams();
    if (value !== "all") sp.set("role", value);
    if (q) sp.set("q", q);
    const qs = sp.toString();
    return qs ? `/admin/users?${qs}` : "/admin/users";
  };
  const activeTab = roleParam ?? "all";

  return (
    <>
      <h1 className="text-2xl font-bold text-ink-900">Users</h1>
        <p className="mt-1 text-ink-500">
          Everyone registered on the portal. Click a name to view their profile, applications, and
          message history.
        </p>

        {/* Filters: role tabs + search */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1">
            {ROLE_TABS.map((tab) => (
              <Link
                key={tab.value}
                href={tabHref(tab.value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  activeTab === tab.value
                    ? "bg-brand-600 text-white"
                    : "text-ink-600 hover:bg-ink-100"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          <form method="GET" action="/admin/users" className="flex items-center gap-2">
            {roleParam && <input type="hidden" name="role" value={roleParam} />}
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search name or email…"
              className="input h-9 w-56 py-1.5"
            />
            <button type="submit" className="btn-secondary h-9 px-3 py-1.5 text-sm">
              Search
            </button>
            {q && (
              <Link href={tabHref(activeTab)} className="text-sm text-ink-400 hover:text-ink-600">
                Clear
              </Link>
            )}
          </form>
        </div>

        <div className="card mt-4 overflow-hidden">
          {users.length === 0 ? (
            <div className="px-6 py-16 text-center text-ink-400">
              No users match {q ? `“${q}”` : "this filter"}.
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Role</th>
                  {canManageRoles && <th className="px-5 py-3">Abilities</th>}
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
                    <td className="px-5 py-4">
                      {canManageRoles ? (
                        <RoleSelect userId={u.id} role={u.role} />
                      ) : (
                        <span className="text-ink-700">{ROLE_LABEL[u.role] ?? u.role}</span>
                      )}
                    </td>
                    {canManageRoles && (
                      <td className="px-5 py-4">
                        {u.role === "ADMIN" ? (
                          <AbilitiesEditor
                            userId={u.id}
                            initial={parsePermissions(u.permissions)}
                            abilities={ABILITY_LIST}
                          />
                        ) : (
                          <span className="text-xs text-ink-400">—</span>
                        )}
                      </td>
                    )}
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
          )}
        </div>
    </>
  );
}
