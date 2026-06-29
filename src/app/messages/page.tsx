import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import ChatApp from "@/components/chat/ChatApp";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: { with?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const isStaff = user.role === "ADMIN" || user.role === "LAWYER";

  // Staff can deep-link to a specific applicant's chat via ?with=<userId>.
  let initialActiveId: string | null = null;
  let initialName: string | undefined;
  if (isStaff && searchParams.with) {
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
    <div className="min-h-screen">
      <AppHeader user={user} />
      <main className="mx-auto w-[90%] py-8">
        <h1 className="text-2xl font-bold text-ink-900">Messages</h1>
        <p className="mt-1 text-ink-500">
          {isStaff
            ? "Chat with applicants — send messages, voice notes and documents."
            : "Chat with our team — send messages, voice notes and documents."}
        </p>
        <div className="mt-6">
          <ChatApp
            meId={user.id}
            isStaff={isStaff}
            initialActiveId={initialActiveId}
            initialName={initialName}
          />
        </div>
      </main>
    </div>
  );
}
