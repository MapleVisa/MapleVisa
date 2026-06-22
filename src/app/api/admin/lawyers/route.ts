import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// List lawyers with their current active caseload so an admin can assign a case
// to an available one.
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const lawyers = await prisma.user.findMany({
    where: { role: "LAWYER" },
    select: {
      id: true,
      fullName: true,
      email: true,
      _count: {
        select: {
          lawyerCases: { where: { status: { in: ["WITH_LAWYER", "IN_PROCESSING"] } } },
        },
      },
    },
    orderBy: { fullName: "asc" },
  });

  return NextResponse.json({
    lawyers: lawyers.map((l) => ({
      id: l.id,
      fullName: l.fullName,
      email: l.email,
      activeCases: l._count.lawyerCases,
    })),
  });
}
