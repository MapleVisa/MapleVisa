"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Composer from "./Composer";

export type ChatMsg = {
  id: string;
  body: string;
  kind: string;
  attachmentName: string | null;
  attachmentMime: string | null;
  attachmentSize: number | null;
  durationSec: number | null;
  createdAt: string;
  fromUser: { id: string; fullName: string; role: string } | null;
  toUser: { id: string; fullName: string; role: string } | null;
};

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
function fmtSize(n: number | null) {
  if (!n) return "";
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
}
function fmtDur(s: number | null) {
  if (!s) return "";
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function ChatThread({
  meId,
  withId,
  headerName,
}: {
  meId: string;
  withId?: string | null; // staff: the applicant's id; applicant: omit (own thread)
  headerName?: string;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  const url = withId ? `/api/messages?with=${withId}` : `/api/messages`;

  const load = useCallback(async () => {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      setMessages(j.messages || []);
      setLoaded(true);
    } catch {
      /* ignore transient errors */
    }
  }, [url]);

  // Initial load + poll every 4s for new messages (lightweight live updates).
  useEffect(() => {
    setLoaded(false);
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  // Keep pinned to the bottom when new messages arrive (if already at bottom).
  useEffect(() => {
    if (atBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {headerName && (
        <div className="border-b border-ink-200 bg-white px-4 py-3">
          <p className="font-semibold text-ink-900">{headerName}</p>
        </div>
      )}

      <div ref={scrollRef} onScroll={onScroll} className="flex-1 space-y-2 overflow-y-auto bg-ink-50 p-4">
        {!loaded ? (
          <p className="py-10 text-center text-sm text-ink-400">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-400">No messages yet. Say hello 👋</p>
        ) : (
          messages.map((m) => {
            const mine = m.fromUser?.id === meId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2 shadow-soft ${
                    mine ? "rounded-br-sm bg-brand-600 text-white" : "rounded-bl-sm bg-white text-ink-800"
                  }`}
                >
                  {!mine && (
                    <p className="mb-0.5 text-xs font-semibold text-brand-600">
                      {m.fromUser?.fullName}
                    </p>
                  )}

                  {m.kind === "VOICE" && (
                    <div className="flex items-center gap-2">
                      <audio
                        controls
                        preload="none"
                        src={`/api/messages/${m.id}/attachment`}
                        className="h-9 max-w-[220px]"
                      />
                      {m.durationSec ? (
                        <span className={`text-xs ${mine ? "text-white/80" : "text-ink-400"}`}>
                          {fmtDur(m.durationSec)}
                        </span>
                      ) : null}
                    </div>
                  )}

                  {m.kind === "FILE" && (
                    <a
                      href={`/api/messages/${m.id}/attachment`}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                        mine ? "bg-white/15 hover:bg-white/25" : "bg-ink-50 hover:bg-ink-100"
                      }`}
                    >
                      <span className="text-lg">{m.attachmentMime?.startsWith("image/") ? "🖼️" : "📄"}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{m.attachmentName}</span>
                        <span className={`block text-xs ${mine ? "text-white/70" : "text-ink-400"}`}>
                          {fmtSize(m.attachmentSize)}
                        </span>
                      </span>
                    </a>
                  )}

                  {m.body && <p className="mt-1 whitespace-pre-wrap break-words text-sm">{m.body}</p>}

                  <p className={`mt-1 text-right text-[10px] ${mine ? "text-white/70" : "text-ink-400"}`}>
                    {fmtTime(m.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Composer toUserId={withId ?? undefined} onSent={load} />
    </div>
  );
}
