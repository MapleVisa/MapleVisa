import "server-only";
import { prisma } from "./db";

export type MessageDirection = "toStaff" | "toUser";

const messageSelect = {
  id: true,
  subject: true,
  body: true,
  readAt: true,
  createdAt: true,
  applicationId: true,
  fromUser: { select: { id: true, fullName: true, email: true, role: true } },
  toUser: { select: { id: true, fullName: true, email: true, role: true } },
} as const;

/**
 * Send a message.
 * - Applicant → staff team inbox: pass no `toUserId` (or null).
 * - Staff → a specific applicant: pass that applicant's `toUserId`.
 */
export async function sendMessage(opts: {
  fromUserId: string;
  toUserId?: string | null;
  applicationId?: string | null;
  subject?: string | null;
  body: string;
}) {
  return prisma.message.create({
    data: {
      fromUserId: opts.fromUserId,
      toUserId: opts.toUserId ?? null,
      applicationId: opts.applicationId ?? null,
      subject: opts.subject?.trim() || null,
      body: opts.body.trim(),
    },
    select: messageSelect,
  });
}

/** Messages addressed to the staff/team inbox (applicant → staff), newest first. */
export async function listTeamInbox(limit = 100) {
  return prisma.message.findMany({
    where: { toUserId: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: messageSelect,
  });
}

/** Conversation for one applicant: both messages they sent to staff and ones staff sent them. */
export async function listMessagesForUser(userId: string) {
  return prisma.message.findMany({
    where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
    orderBy: { createdAt: "asc" },
    select: messageSelect,
  });
}

/** Messages an applicant should see in their own inbox (sent to them + sent by them to staff). */
export async function listInboxFor(userId: string) {
  return prisma.message.findMany({
    where: { OR: [{ toUserId: userId }, { fromUserId: userId, toUserId: null }] },
    orderBy: { createdAt: "desc" },
    select: messageSelect,
  });
}

/** All messages tied to a specific application (oldest first). */
export async function listMessagesForApplication(applicationId: string) {
  return prisma.message.findMany({
    where: { applicationId },
    orderBy: { createdAt: "asc" },
    select: messageSelect,
  });
}

/** Count of unread messages for a recipient (an applicant). */
export async function unreadCountFor(userId: string) {
  return prisma.message.count({ where: { toUserId: userId, readAt: null } });
}

/** Count of unread messages in the staff team inbox. */
export async function unreadTeamCount() {
  return prisma.message.count({ where: { toUserId: null, readAt: null } });
}

/** Mark a single message read, but only if the caller is its rightful recipient. */
export async function markRead(messageId: string, opts: { userId: string; isStaff: boolean }) {
  const msg = await prisma.message.findUnique({ where: { id: messageId } });
  if (!msg) return false;
  const isRecipient = msg.toUserId === opts.userId || (msg.toUserId === null && opts.isStaff);
  if (!isRecipient) return false;
  if (!msg.readAt) {
    await prisma.message.update({ where: { id: messageId }, data: { readAt: new Date() } });
  }
  return true;
}
