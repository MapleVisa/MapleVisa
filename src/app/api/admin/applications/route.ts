import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "LAWYER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  // Lawyers only see cases assigned to them or already validated/with lawyer.
  const where: any = {};
  if (status) where.status = status;
  if (user.role === "LAWYER") {
    where.OR = [{ lawyerId: user.id }, { status: { in: ["VALIDATED", "WITH_LAWYER", "IN_PROCESSING"] } }];
  } else {
    // Admin sees everything except untouched drafts.
    where.status = where.status || { not: "DRAFT" };
  }

  const apps = await prisma.application.findMany({
    where,
    orderBy: { submittedAt: "desc" },
    include: { user: true, lawyer: true },
  });

  return NextResponse.json({
    applications: apps.map((a) => ({
      id: a.id,
      reference: a.reference,
      program: a.program,
      status: a.status,
      reviewNote: a.reviewNote,
      submittedAt: a.submittedAt,
      updatedAt: a.updatedAt,
      applicant: { fullName: a.user.fullName, email: a.user.email },
      lawyer: a.lawyer ? { fullName: a.lawyer.fullName } : null,
    })),
  });
}
