import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getProgram } from "@/lib/programs";
import { generateReference } from "@/lib/applications";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apps = await prisma.application.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      reference: true,
      program: true,
      status: true,
      currentStep: true,
      reviewNote: true,
      createdAt: true,
      updatedAt: true,
      submittedAt: true,
    },
  });
  return NextResponse.json({ applications: apps });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const program = body?.program;
  if (!getProgram(program)) {
    return NextResponse.json({ error: "Invalid program." }, { status: 400 });
  }

  const app = await prisma.application.create({
    data: {
      userId: user.id,
      program,
      reference: generateReference(),
      status: "DRAFT",
      data: "{}",
      events: {
        create: {
          type: "SYSTEM",
          message: "Application created.",
          actor: user.fullName,
        },
      },
    },
  });

  return NextResponse.json({ id: app.id });
}
