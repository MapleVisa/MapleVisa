import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { consumeToken } from "@/lib/tokens";
import { baseUrl } from "@/lib/email";

// Email verification link target. Marks the email verified, then sends the user
// to the login page with a success (or error) flag.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  const base = baseUrl(req);
  const userId = await consumeToken(token, "VERIFY");
  if (!userId) {
    return NextResponse.redirect(`${base}/login?verify_error=1`);
  }
  await prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } });
  return NextResponse.redirect(`${base}/login?verified=1`);
}
