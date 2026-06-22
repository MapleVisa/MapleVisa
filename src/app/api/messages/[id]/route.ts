import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { markRead } from "@/lib/messages";

// Mark a message as read (only the rightful recipient can).
export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isStaff = user.role === "ADMIN" || user.role === "LAWYER";
  const ok = await markRead(params.id, { userId: user.id, isStaff });
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
