import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import ChatApp from "@/components/chat/ChatApp";
import { getCurrentUser } from "@/lib/auth";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: { with?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Staff use the chat inside the admin shell.
  if (user.role === "ADMIN" || user.role === "LAWYER") {
    redirect(searchParams.with ? `/admin/messages?with=${searchParams.with}` : "/admin/messages");
  }

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <main className="mx-auto w-[90%] py-8">
        <h1 className="text-2xl font-bold text-ink-900">Messages</h1>
        <p className="mt-1 text-ink-500">
          Chat with our team — send messages, voice notes and documents.
        </p>
        <div className="mt-6">
          <ChatApp meId={user.id} isStaff={false} />
        </div>
      </main>
    </div>
  );
}
