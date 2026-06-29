import AdminAIChat from "@/components/ai/AdminAIChat";

export default function AdminAIPage() {
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
