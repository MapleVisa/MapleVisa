import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { saveFile, deleteFile, sniffMime } from "@/lib/storage";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const AVATAR_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png" };

// Upload / replace the current user's profile image.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image provided." }, { status: 400 });
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json({ error: "Image is too large (max 5 MB)." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const realMime = sniffMime(buffer, file.type);
  if (!realMime || !AVATAR_EXT[realMime]) {
    return NextResponse.json({ error: "Only JPG or PNG images are allowed." }, { status: 400 });
  }

  const fileName = `${user.id}-${randomUUID()}.${AVATAR_EXT[realMime]}`;
  const key = await saveFile("avatars", fileName, buffer, realMime);

  const prev = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarKey: true } });
  await prisma.user.update({ where: { id: user.id }, data: { avatarKey: key } });

  // Remove the previous avatar to avoid orphaned files.
  if (prev?.avatarKey && prev.avatarKey !== key) {
    await deleteFile("avatars", prev.avatarKey);
  }

  return NextResponse.json({ ok: true });
}
