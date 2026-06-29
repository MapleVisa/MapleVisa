import "server-only";
import { prisma } from "./db";

const messageSelect = {
  id: true,
  subject: true,
  body: true,
  kind: true,
  attachmentName: true,
  attachmentMime: true,
  attachmentSize: true,
  durationSec: true,
  readAt: true,
  createdAt: true,
  applicationId: true,
  fromUser: { select: { id: true, fullName: true, email: true, role: true } },
  toUser: { select: { id: true, fullName: true, email: true, role: true } },
} as const;

export type ChatMessageRow = Awaited<ReturnType<typeof sendMessage>>;

/**
 * Send a message (text, voice note, or document).
 * - Applicant → staff team: pass no `toUserId` (or null).
 * - Staff → a specific applicant: pass that applicant's `toUserId`.
 */
export async function sendMessage(opts: {
  fromUserId: string;
  toUserId?: string | null;
  applicationId?: string | null;
  subject?: string | null;
  body?: string;
  kind?: string;
  attachmentKey?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
  attachmentSize?: number | null;
  durationSec?: number | null;
}) {
  return prisma.message.create({
    data: {
      fromUserId: opts.fromUserId,
      toUserId: opts.toUserId ?? null,
      applicationId: opts.applicationId ?? null,
      subject: opts.subject?.trim() || null,
      body: (opts.body ?? "").trim(),
      kind: opts.kind ?? "TEXT",
      attachmentKey: opts.attachmentKey ?? null,
      attachmentName: opts.attachmentName ?? null,
      attachmentMime: opts.attachmentMime ?? null,
      attachmentSize: opts.attachmentSize ?? null,
      durationSec: opts.durationSec ?? null,
    },
    select: messageSelect,
  });
}

/** Full chat thread between one applicant and staff (oldest first). */
export async function listThread(applicantId: string) {
  return prisma.message.findMany({
    where: { OR: [{ fromUserId: applicantId, toUserId: null }, { toUserId: applicantId }] },
    orderBy: { createdAt: "asc" },
    select: messageSelect,
  });
}

/** Applicant's own inbox thread (alias of listThread for clarity). */
export const listInboxFor = listThread;

/**
 * Staff conversation list — one entry per applicant, with their name, the last
 * message preview and the count of unread (applicant → team) messages.
 */
export async function listThreadsForStaff() {
  const rows = await prisma.message.findMany({
    orderBy: { createdAt: "desc" },
    select: messageSelect,
    take: 1000,
  });

  type Thread = {
    applicant: { id: string; fullName: string; email: string };
    lastMessage: (typeof rows)[number];
    unread: number;
  };
  const threads = new Map<string, Thread>();

  for (const m of rows) {
    // The applicant is the non-staff participant.
    const applicant =
      m.fromUser?.role === "APPLICANT" ? m.fromUser : m.toUser?.role === "APPLICANT" ? m.toUser : null;
    if (!applicant) continue;
    let t = threads.get(applicant.id);
    if (!t) {
      t = { applicant, lastMessage: m, unread: 0 }; // rows are desc → first seen is latest
      threads.set(applicant.id, t);
    }
    // Unread = applicant → team messages not yet read by staff.
    if (m.toUser === null && !m.readAt) t.unread += 1;
  }

  return Array.from(threads.values());
}

/** Count of unread messages for an applicant (messages addressed to them). */
export async function unreadCountFor(userId: string) {
  return prisma.message.count({ where: { toUserId: userId, readAt: null } });
}

/** Count of unread messages in the staff team inbox. */
export async function unreadTeamCount() {
  return prisma.message.count({ where: { toUserId: null, readAt: null } });
}

/** Mark a whole thread read for the viewer. */
export async function markThreadRead(applicantId: string, viewerIsStaff: boolean) {
  if (viewerIsStaff) {
    await prisma.message.updateMany({
      where: { fromUserId: applicantId, toUserId: null, readAt: null },
      data: { readAt: new Date() },
    });
  } else {
    await prisma.message.updateMany({
      where: { toUserId: applicantId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}

/** Load one message (for serving its attachment), with participants for auth. */
export async function getMessageForAttachment(id: string) {
  return prisma.message.findUnique({
    where: { id },
    select: {
      id: true,
      fromUserId: true,
      toUserId: true,
      attachmentKey: true,
      attachmentMime: true,
      attachmentName: true,
    },
  });
}

// Kept for the case page's per-application message history.
export async function listMessagesForApplication(applicationId: string) {
  return prisma.message.findMany({
    where: { applicationId },
    orderBy: { createdAt: "asc" },
    select: messageSelect,
  });
}
