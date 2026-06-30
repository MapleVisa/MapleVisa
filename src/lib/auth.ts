import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

const COOKIE_NAME = "mv_session";

// The single super-admin: auto-promoted on signup and the only account allowed
// to change other users' roles (including removing other admins).
export const SUPER_ADMIN_EMAIL = "h.izadian1397@gmail.com";
export function isSuperAdmin(email?: string | null): boolean {
  return (email || "").trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}

// The session-signing secret must be strong and explicitly set in production.
// A weak/missing secret would let anyone forge admin sessions, so we fail fast
// at startup rather than silently falling back to a known value.
function resolveSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!s || s.length < 32 || s === "dev-secret-change-me" || s === "change-me-to-a-long-random-string") {
      throw new Error(
        "AUTH_SECRET is missing or too weak in production. Set a random 32+ char value " +
          '(generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))").'
      );
    }
    return s;
  }
  return s || "dev-secret-change-me";
}

let cachedSecret: Uint8Array | null = null;
function getSecret(): Uint8Array {
  if (!cachedSecret) cachedSecret = new TextEncoder().encode(resolveSecret());
  return cachedSecret;
}

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: "APPLICANT" | "ADMIN" | "LAWYER";
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function destroySession() {
  cookies().set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      id: payload.sub as string,
      email: payload.email as string,
      fullName: payload.fullName as string,
      role: payload.role as SessionUser["role"],
    };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function authenticate(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  return user;
}
