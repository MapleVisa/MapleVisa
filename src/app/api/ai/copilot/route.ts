import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAI, parseJsonLoose } from "@/lib/ai";
import { copilotAskSystem, copilotFillSystem } from "@/lib/ai/prompts";
import { getProgram } from "@/lib/programs";
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
  const mode = body?.mode === "fill" ? "fill" : "ask";
  const program = body?.program;
  const sectionId = body?.sectionId;

  const prog = getProgram(program);
  const section = prog?.sections.find((s) => s.id === sectionId);
  if (!prog || !section) {
    return NextResponse.json({ error: "Unknown section." }, { status: 400 });
  }

  const locale = await getLocale();

  try {
    if (mode === "fill") {
      let description = String(body?.description || "").trim();
      if (!description) return NextResponse.json({ error: "No description." }, { status: 400 });

      // Two-step for reliability: if the description uses a non-Latin script,
      // translate it to English first, then extract. Smaller models struggle to
      // comprehend another language AND emit structured JSON in a single pass.
      if (/[\u0370-\uFFFF]/.test(description)) {
        try {
          description = (
            await ai.chat({
              system:
                "Translate the user's text into English. Transliterate personal names and place names into the Latin alphabet, and convert non-Western digits to Western. Output ONLY the English translation — no notes, no quotes.",
              messages: [{ role: "user", content: description }],
              temperature: 0,
            })
          ).trim();
        } catch {
          // If translation fails, fall back to extracting from the original text.
        }
      }
      const out = await ai.chat({
        system: copilotFillSystem(program, section, locale),
        messages: [{ role: "user", content: description }],
        json: true,
        temperature: 0.2,
      });
      const parsed = parseJsonLoose<{ values: Record<string, any>; note: string }>(out);
      if (!parsed) return NextResponse.json({ error: "Could not parse AI output." }, { status: 502 });

      // Keep only known field keys for this section.
      const allowed = new Set(section.fields.map((f) => f.name));
      const values: Record<string, any> = {};
      for (const [k, v] of Object.entries(parsed.values || {})) {
        if (allowed.has(k)) values[k] = v;
      }
      return NextResponse.json({ values, note: parsed.note || "" });
    }

    const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages.slice(-12) : [];
    if (!messages.length) return NextResponse.json({ error: "No messages." }, { status: 400 });
    const reply = await ai.chat({
      system: copilotAskSystem(program, section, locale),
      messages,
      temperature: 0.4,
    });

    // Persist the thread so the user can recall it later. Only tie it to an
    // application the user actually owns.
    let conversationId: string | undefined;
    try {
      const applicationId = await ownedApplicationId(body?.applicationId, user.id);
      const full: StoredMessage[] = [
        ...(Array.isArray(body?.messages) ? body.messages : []),
        { role: "model", content: reply, at: new Date().toISOString() },
      ];
      conversationId = await saveConversation({
        id: body?.conversationId,
        userId: user.id,
        kind: "copilot",
        applicationId,
        sectionId,
        messages: full,
        titleFallback: section.title,
      });
    } catch {
      // Saving is best-effort; never block the reply on a persistence error.
    }

    return NextResponse.json({ reply, conversationId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "AI error" }, { status: 502 });
  }
}

// Returns the applicationId only if it exists and belongs to the user.
async function ownedApplicationId(id: unknown, userId: string): Promise<string | null> {
  if (typeof id !== "string" || !id) return null;
  const app = await prisma.application.findFirst({ where: { id, userId }, select: { id: true } });
  return app?.id ?? null;
}
