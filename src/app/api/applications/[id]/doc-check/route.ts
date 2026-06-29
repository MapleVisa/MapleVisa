import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { readFile } from "@/lib/storage";
import { getAI, parseJsonLoose } from "@/lib/ai";
import { docCategoryCheckSystem } from "@/lib/ai/prompts";
import { requiredDocsForProgram, statusForCompleteness } from "@/lib/documents";
import { rateLimit, tooMany } from "@/lib/rate-limit";

const MAX_FILES_PER_CHECK = 8;

async function canAccess(appId: string, userId: string, role: string) {
  const app = await prisma.application.findUnique({ where: { id: appId } });
  if (!app) return null;
  const isStaff = role === "ADMIN" || role === "LAWYER";
  if (app.userId !== userId && !isStaff) return null;
  return app;
}

// Re-assess one document category for an application by analysing all of its
// uploaded files together. Stores the result in Application.docChecks (a JSON
// map keyed by category).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const app = await canAccess(params.id, user.id, user.role);
  if (!app) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rl = await rateLimit(`ai:${user.id}`, 30, 300);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const body = await req.json().catch(() => null);
  const category = String(body?.category || "");
  const req2 = requiredDocsForProgram(app.program).find((r) => r.category === category);
  if (!req2) return NextResponse.json({ error: "Unknown required category." }, { status: 400 });

  const ai = getAI();
  if (!ai.isConfigured()) return NextResponse.json({ error: "AI_NOT_CONFIGURED" }, { status: 503 });

  const docs = await prisma.document.findMany({
    where: { applicationId: app.id, category },
    orderBy: { createdAt: "asc" },
    take: MAX_FILES_PER_CHECK,
  });

  // Build the result, then persist it into the docChecks JSON map.
  let result: {
    completeness: number;
    present: string[];
    missing: string[];
    notes: string;
    status: string;
    at: string;
  };

  if (docs.length === 0) {
    result = {
      completeness: 0,
      present: [],
      missing: req2.requiredInfo,
      notes: "No file uploaded yet for this document.",
      status: "red",
      at: new Date().toISOString(),
    };
  } else {
    try {
      const files = await Promise.all(
        docs.map(async (d) => ({
          mimeType: d.mimeType,
          dataBase64: (await readFile(d.applicationId, d.storedName)).toString("base64"),
        }))
      );
      const out = await ai.chat({
        system: docCategoryCheckSystem(category, req2.requiredInfo),
        messages: [
          {
            role: "user",
            content: `Assess the ${docs.length} attached file(s) for the applicant's "${category}". Return the JSON analysis.`,
          },
        ],
        files,
        json: true,
        temperature: 0.1,
        model: process.env.AI_VISION_MODEL || "pixtral-12b-latest",
      });
      const parsed = parseJsonLoose<any>(out) || {};
      const completeness = Math.max(0, Math.min(100, Math.round(Number(parsed.completeness) || 0)));
      result = {
        completeness,
        present: Array.isArray(parsed.present) ? parsed.present : [],
        missing: Array.isArray(parsed.missing) ? parsed.missing : req2.requiredInfo,
        notes: typeof parsed.notes === "string" ? parsed.notes : "",
        status: statusForCompleteness(completeness),
        at: new Date().toISOString(),
      };
    } catch (e: any) {
      result = {
        completeness: 0,
        present: [],
        missing: req2.requiredInfo,
        notes: "Could not analyse the files. Please try again.",
        status: "red",
        at: new Date().toISOString(),
      };
    }
  }

  // Read-modify-write the docChecks map.
  const fresh = await prisma.application.findUnique({
    where: { id: app.id },
    select: { docChecks: true },
  });
  let map: Record<string, any> = {};
  try {
    map = fresh?.docChecks ? JSON.parse(fresh.docChecks) : {};
  } catch {
    map = {};
  }
  map[category] = result;
  await prisma.application.update({
    where: { id: app.id },
    data: { docChecks: JSON.stringify(map) },
  });

  return NextResponse.json({ category, check: result });
}
