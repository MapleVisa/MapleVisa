import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listConversations, type ConversationKind } from "@/lib/conversations";

// GET /api/ai/conversations?kind=copilot&applicationId=...&sectionId=...
// Lists the current user's saved conversations (titles only, newest first).
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const kind = (searchParams.get("kind") || undefined) as ConversationKind | undefined;
  const applicationIdParam = searchParams.get("applicationId");
  const sectionId = searchParams.get("sectionId") || undefined;

  // For the general advisor (no application), match rows with no applicationId.
  const applicationId =
    applicationIdParam !== null
      ? applicationIdParam
      : kind === "advisor"
      ? null
      : undefined;

  const conversations = await listConversations(user.id, { kind, applicationId, sectionId });
  return NextResponse.json({ conversations });
}
