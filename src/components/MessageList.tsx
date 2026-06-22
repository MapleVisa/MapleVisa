type MessageUser = { id: string; fullName: string; email: string; role: string } | null;

export type MessageItem = {
  id: string;
  subject: string | null;
  body: string;
  readAt: Date | string | null;
  createdAt: Date | string;
  applicationId: string | null;
  fromUser: MessageUser;
  toUser: MessageUser;
};

function fmt(d: Date | string) {
  return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/**
 * Renders a list of messages. `viewerIsStaff` controls the directional label
 * (a message with no recipient is "from a user to the team").
 */
export default function MessageList({
  messages,
  viewerIsStaff = false,
  emptyText = "No messages yet.",
}: {
  messages: MessageItem[];
  viewerIsStaff?: boolean;
  emptyText?: string;
}) {
  if (!messages.length) {
    return <p className="px-1 py-6 text-center text-sm text-ink-400">{emptyText}</p>;
  }
  return (
    <ul className="space-y-3">
      {messages.map((m) => {
        const toTeam = m.toUser === null;
        const direction = toTeam
          ? `${m.fromUser?.fullName ?? "User"} → Team`
          : `${m.fromUser?.fullName ?? "Staff"} → ${m.toUser?.fullName ?? "Applicant"}`;
        const unread = viewerIsStaff && toTeam && !m.readAt;
        return (
          <li
            key={m.id}
            className={`rounded-xl border px-4 py-3 ${
              unread ? "border-brand-200 bg-brand-50/40" : "border-ink-200 bg-white"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-ink-700">{direction}</span>
              <span className="text-xs text-ink-400">{fmt(m.createdAt)}</span>
            </div>
            {m.subject && <div className="mt-1 text-sm font-semibold text-ink-900">{m.subject}</div>}
            <p className="mt-1 whitespace-pre-wrap text-sm text-ink-600">{m.body}</p>
          </li>
        );
      })}
    </ul>
  );
}
