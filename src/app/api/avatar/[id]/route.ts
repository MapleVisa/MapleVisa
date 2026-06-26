import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { readFile } from "@/lib/storage";

// Stream a user's profile image. Any signed-in user may load avatars (e.g. an
// admin viewing an applicant's profile). The image bytes come from private
// storage — there is no public URL.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const viewer = await getCurrentUser();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: { avatarKey: true },
  });
  if (!target?.avatarKey) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ext = target.avatarKey.split(".").pop()?.toLowerCase();
  const contentType = ext === "png" ? "image/png" : "image/jpeg";

  try {
    const buf = await readFile("avatars", target.avatarKey);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
}
