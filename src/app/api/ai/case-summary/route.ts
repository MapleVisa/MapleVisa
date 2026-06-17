import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAI, parseJsonLoose } from "@/lib/ai";
import { CASE_SUMMARY_SYSTEM } from "@/lib/ai/prompts";
import { getProgram } from "@/lib/programs";
import { saveConversation } from "@/lib/conversations";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "LAWYER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ai = getAI();
  if (!ai.isConfigured()) {
    return NextResponse.json({ error: "AI_NOT_CONFIGURED" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const app = await prisma.application.findUnique({ where: { id: body?.applicationId } });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const prog = getProgram(app.program);
  const data = JSON.parse(app.data || "{}");
  const payload = {
    program: prog?.name ?? app.program,
    status: app.status,
    data,
  };

  try {
    const out = await ai.chat({
      system: CASE_SUMMARY_SYSTEM,
      messages: [
        { role: "user", content: `Application data:\n${JSON.stringify(payload, null, 2)}` },
      ],
      json: true,
      temperature: 0.2,
    });
    const parsed = parseJsonLoose<any>(out);
    if (!parsed) return NextResponse.json({ error: "Could not parse AI output." }, { status: 502 });

    // Persist the generated summary so staff can recall it without regenerating.
    let conversationId: string | undefined;
    try {
      conversationId = await saveConversation({
        id: body?.conversationId,
        userId: user.id,
        kind: "case",
        applicationId: app.id,
        messages: [{ role: "model", content: JSON.stringify(parsed), at: new Date().toISOString() }],
        titleFallback: `${prog?.name ?? app.program} — ${app.reference}`,
      });
    } catch {
      // best-effort persistence
    }

    return NextResponse.json({ result: parsed, conversationId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "AI error" }, { status: 502 });
  }
}
