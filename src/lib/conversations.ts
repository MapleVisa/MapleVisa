import "server-only";
import { prisma } from "./db";

export type StoredRole = "user" | "model";
export interface StoredMessage {
  role: StoredRole;
  content: string;
  at?: string;
}

export type ConversationKind = "copilot" | "advisor" | "case";

function titleFrom(messages: StoredMessage[], fallback: string): string {
  const firstUser = messages.find((m) => m.role === "user" && m.content.trim());
  const base = (firstUser?.content || fallback).trim().replace(/\s+/g, " ");
  return base.length > 60 ? base.slice(0, 57) + "…" : base;
}

function parseMessages(raw: string): StoredMessage[] {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** List a user's saved conversations (most recent first), without message bodies. */
export async function listConversations(
  userId: string,
  filter: { kind?: ConversationKind; applicationId?: string | null; sectionId?: string | null } = {}
) {
  const rows = await prisma.conversation.findMany({
    where: {
      userId,
      ...(filter.kind ? { kind: filter.kind } : {}),
      ...(filter.applicationId !== undefined ? { applicationId: filter.applicationId } : {}),
      ...(filter.sectionId !== undefined ? { sectionId: filter.sectionId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, kind: true, title: true, applicationId: true, sectionId: true, updatedAt: true },
  });
  return rows;
}

/** Fetch one conversation (with messages) if it belongs to the user. */
export async function getConversation(id: string, userId: string) {
  const row = await prisma.conversation.findFirst({ where: { id, userId } });
  if (!row) return null;
  return { ...row, messages: parseMessages(row.messages) };
}

/**
 * Create a new conversation or update an existing one's messages.
 * When `id` is provided and owned by the user, it is updated in place;
 * otherwise a new conversation is created. Returns the conversation id.
 */
export async function saveConversation(opts: {
  id?: string | null;
  userId: string;
  kind: ConversationKind;
  applicationId?: string | null;
  sectionId?: string | null;
  messages: StoredMessage[];
  titleFallback?: string;
}): Promise<string> {
  const title = titleFrom(opts.messages, opts.titleFallback || "Conversation");
  const data = JSON.stringify(opts.messages);

  if (opts.id) {
    const existing = await prisma.conversation.findFirst({
      where: { id: opts.id, userId: opts.userId },
      select: { id: true },
    });
    if (existing) {
      await prisma.conversation.update({
        where: { id: existing.id },
        data: { messages: data, title },
      });
      return existing.id;
    }
  }

  const created = await prisma.conversation.create({
    data: {
      userId: opts.userId,
      kind: opts.kind,
      applicationId: opts.applicationId ?? null,
      sectionId: opts.sectionId ?? null,
      title,
      messages: data,
    },
    select: { id: true },
  });
  return created.id;
}

export async function deleteConversation(id: string, userId: string): Promise<boolean> {
  const res = await prisma.conversation.deleteMany({ where: { id, userId } });
  return res.count > 0;
}
