import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, isLocale } from "@/i18n/config";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const locale = body?.locale;
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }
  cookies().set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return NextResponse.json({ ok: true });
}
