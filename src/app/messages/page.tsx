import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import ChatApp from "@/components/chat/ChatApp";
import { getCurrentUser } from "@/lib/auth";

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const isStaff = user.role === "ADMIN" || user.role === "LAWYER";

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
          <ChatApp meId={user.id} isStaff={isStaff} />
        </div>
      </main>
    </div>
  );
}
