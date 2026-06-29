import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listThreadsForStaff } from "@/lib/messages";

// Staff conversation list: one entry per applicant (name, last message, unread).
export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "LAWYER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const threads = await listThreadsForStaff();
  return NextResponse.json({ threads });
}
