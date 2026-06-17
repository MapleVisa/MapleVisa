import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAI } from "@/lib/ai";
import { eligibilitySystem } from "@/lib/ai/prompts";
import { saveConversation, type StoredMessage } from "@/lib/conversations";
import { getLocale } from "@/i18n";
import type { ChatMessage } from "@/lib/ai/types";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ai = getAI();
  if (!ai.isConfigured()) {
    return NextResponse.json({ error: "AI_NOT_CONFIGURED" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages.slice(-12) : [];
  if (!messages.length) {
    return NextResponse.json({ error: "No messages." }, { status: 400 });
  }

  try {
    const locale = await getLocale();
    const reply = await ai.chat({ system: eligibilitySystem(locale), messages, temperature: 0.5 });

    let conversationId: string | undefined;
    try {
      const full: StoredMessage[] = [
        ...(Array.isArray(body?.messages) ? body.messages : []),
        { role: "model", content: reply, at: new Date().toISOString() },
      ];
      conversationId = await saveConversation({
        id: body?.conversationId,
        userId: user.id,
        kind: "advisor",
        messages: full,
        titleFallback: "Eligibility chat",
      });
    } catch {
      // best-effort persistence
    }

    return NextResponse.json({ reply, conversationId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "AI error" }, { status: 502 });
  }
}
