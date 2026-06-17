import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getConversation, deleteConversation } from "@/lib/conversations";

// GET /api/ai/conversations/[id] — full conversation (with messages).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversation = await getConversation(params.id, user.id);
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ conversation });
}

// DELETE /api/ai/conversations/[id]
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ok = await deleteConversation(params.id, user.id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
