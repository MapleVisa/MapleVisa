import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import MessageList from "@/components/MessageList";
import MessageComposer from "@/components/MessageComposer";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listInboxFor } from "@/lib/messages";

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Staff manage messages from the admin area.
  if (user.role !== "APPLICANT") redirect("/admin");

  // Mark messages addressed to this applicant as read when they open the inbox.
  await prisma.message.updateMany({
    where: { toUserId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  const messages = await listInboxFor(user.id);

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-ink-900">Messages</h1>
        <p className="mt-1 text-ink-500">
          Send a message to our team and read their replies here.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">Inbox</h2>
            <div className="mt-4">
              <MessageList messages={messages} emptyText="No messages yet. Send us a message anytime." />
            </div>
          </div>
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <MessageComposer title="Message our team" placeholder="How can we help with your application?" />
          </aside>
        </div>
      </main>
    </div>
  );
}
