import "server-only";
import { prisma } from "./db";
import { isSuperAdmin } from "./auth";

// Granular admin abilities. The super-admin always has all of them and grants
// any subset to other admins. Any admin can always view the review queue and
// open a case (read-only); these abilities gate the actions on top of that.
export const ADMIN_ABILITIES = [
  { key: "review", label: "Review & update cases", hint: "Change status, request info, add notes, reject" },
  { key: "accept", label: "Accept & assign to lawyers", hint: "Validate applications and assign a lawyer" },
  { key: "delete", label: "Delete applications", hint: "Permanently remove applications and their data" },
  { key: "users", label: "Manage users", hint: "View the users list and profiles" },
  { key: "messages", label: "Message applicants", hint: "Use the chat with applicants" },
  { key: "ai", label: "Use the AI assistant", hint: "Open the staff AI assistant" },
] as const;

export type AbilityKey = (typeof ADMIN_ABILITIES)[number]["key"];
export const ALL_ABILITIES: AbilityKey[] = ADMIN_ABILITIES.map((a) => a.key);

export function parsePermissions(raw: string | null | undefined): AbilityKey[] {
  try {
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr.filter((k) => (ALL_ABILITIES as string[]).includes(k)) : [];
  } catch {
    return [];
  }
}

type Sessionish = { id: string; email: string; role: string };

/**
 * The set of admin abilities a user currently has.
 * - Super-admin: all abilities.
 * - Admin: whatever the super-admin granted (stored in User.permissions).
 * - Anyone else: none (lawyers/applicants use their own flows).
 */
export async function getAbilities(user: Sessionish): Promise<Set<AbilityKey>> {
  if (isSuperAdmin(user.email)) return new Set(ALL_ABILITIES);
  if (user.role !== "ADMIN") return new Set();
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { permissions: true } });
  return new Set(parsePermissions(row?.permissions));
}

export async function hasAbility(user: Sessionish, ability: AbilityKey): Promise<boolean> {
  return (await getAbilities(user)).has(ability);
}
