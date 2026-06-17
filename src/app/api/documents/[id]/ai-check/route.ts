import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { readFile } from "@/lib/storage";
import { getAI, parseJsonLoose } from "@/lib/ai";
import { DOC_CHECK_SYSTEM } from "@/lib/ai/prompts";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await prisma.document.findUnique({
    where: { id: params.id },
    include: { application: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isStaff = user.role === "ADMIN" || user.role === "LAWYER";
  if (doc.application.userId !== user.id && !isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ai = getAI();
  if (!ai.isConfigured()) {
    return NextResponse.json({ error: "AI_NOT_CONFIGURED" }, { status: 503 });
  }

  await prisma.document.update({ where: { id: doc.id }, data: { aiStatus: "CHECKING" } });

  try {
    const buf = await readFile(doc.applicationId, doc.storedName);
    const dataBase64 = buf.toString("base64");

    const out = await ai.chat({
      system: DOC_CHECK_SYSTEM,
      messages: [
        {
          role: "user",
          content: `The applicant uploaded this document and declared it is their: "${doc.category}". Inspect the attached file. Verify it genuinely is a "${doc.category}" by checking for the features unique to that document type, and return the JSON analysis.`,
        },
      ],
      files: [{ mimeType: doc.mimeType, dataBase64 }],
      json: true,
      temperature: 0.1,
      // Document inspection needs a vision-capable model.
      model: process.env.AI_VISION_MODEL || "pixtral-12b-latest",
    });

    const parsed = parseJsonLoose<any>(out);
    const verdict = ["ok", "attention", "reject"].includes(parsed?.verdict) ? parsed.verdict : "attention";

    await prisma.document.update({
      where: { id: doc.id },
      data: { aiStatus: "DONE", aiVerdict: verdict, aiResult: JSON.stringify(parsed ?? { raw: out }) },
    });

    return NextResponse.json({ ok: true, verdict, result: parsed });
  } catch (e: any) {
    await prisma.document.update({
      where: { id: doc.id },
      data: { aiStatus: "ERROR", aiResult: JSON.stringify({ error: e?.message || "error" }) },
    });
    return NextResponse.json({ error: e?.message || "AI error" }, { status: 502 });
  }
}
