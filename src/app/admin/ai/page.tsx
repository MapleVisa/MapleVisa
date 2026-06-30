import { redirect } from "next/navigation";
import AdminAIChat from "@/components/ai/AdminAIChat";
import { getCurrentUser } from "@/lib/auth";
import { getAbilities } from "@/lib/permissions";

export default async function AdminAIPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Lawyers always have the assistant; admins need the "ai" ability.
  if (user.role === "ADMIN" && !(await getAbilities(user)).has("ai")) redirect("/admin");

  return (
    <>
      <h1 className="text-xl font-bold text-ink-900">AI assistant</h1>
      <p className="mt-1 text-sm text-ink-500">
        A private assistant for case research and immigration questions. Your chats are saved here.
      </p>
      <div className="mt-4">
        <AdminAIChat />
      </div>
    </>
  );
}
