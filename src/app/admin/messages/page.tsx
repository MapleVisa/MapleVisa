import { redirect } from "next/navigation";
import ChatApp from "@/components/chat/ChatApp";
import { getCurrentUser } from "@/lib/auth";
import { getAbilities } from "@/lib/permissions";
import { prisma } from "@/lib/db";

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: { with?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN" && user.role !== "LAWYER") redirect("/messages");
  // Lawyers always have chat; admins need the "messages" ability.
  if (user.role === "ADMIN" && !(await getAbilities(user)).has("messages")) redirect("/admin");

  // Deep-link to a specific applicant's chat via ?with=<userId>.
  let initialActiveId: string | null = null;
  let initialName: string | undefined;
  if (searchParams.with) {
    const target = await prisma.user.findFirst({
      where: { id: searchParams.with, role: "APPLICANT" },
      select: { id: true, fullName: true },
    });
    if (target) {
      initialActiveId = target.id;
      initialName = target.fullName;
    }
  }

  return (
    <>
      <h1 className="text-xl font-bold text-ink-900">Messages</h1>
      <p className="mt-1 text-sm text-ink-500">
        Chat with applicants — send messages, voice notes and documents.
      </p>
      <div className="mt-4">
        <ChatApp meId={user.id} isStaff initialActiveId={initialActiveId} initialName={initialName} />
      </div>
    </>
  );
}
