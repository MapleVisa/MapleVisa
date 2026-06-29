import "server-only";
import crypto from "crypto";
import { prisma } from "./db";

export type TokenType = "VERIFY" | "RESET";

export const TOKEN_TTL = {
  VERIFY: 24 * 60 * 60 * 1000, // 24h
  RESET: 60 * 60 * 1000, // 1h
} as const;

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Issue a single-use token; stores only its hash, returns the raw token to email. */
export async function createToken(userId: string, type: TokenType): Promise<string> {
  await prisma.authToken.deleteMany({ where: { userId, type } }); // one active token per purpose
  const raw = crypto.randomBytes(32).toString("hex");
  await prisma.authToken.create({
    data: { tokenHash: hashToken(raw), userId, type, expiresAt: new Date(Date.now() + TOKEN_TTL[type]) },
  });
  return raw;
}

/** Validate + consume a token. Returns the userId if valid, else null. */
export async function consumeToken(raw: string, type: TokenType): Promise<string | null> {
  if (!raw) return null;
  const row = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (!row || row.type !== type || row.expiresAt < new Date()) return null;
  await prisma.authToken.delete({ where: { id: row.id } });
  return row.userId;
}
