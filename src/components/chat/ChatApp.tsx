"use client";

import { useEffect, useState, useCallback } from "react";
import ChatThread from "./ChatThread";

type Thread = {
  applicant: { id: string; fullName: string; email: string };
  lastMessage: { body: string; kind: string; createdAt: string } | null;
  unread: number;
};

function preview(m: Thread["lastMessage"]) {
  if (!m) return "";
  if (m.kind === "VOICE") return "🎤 Voice message";
  if (m.kind === "FILE") return "📄 Document";
  return m.body;
}

// Applicants get a single chat with the team. Staff get a conversation list
// (one per applicant, by name) plus the active chat — like a messaging app.
export default function ChatApp({
  meId,
  isStaff,
  initialActiveId = null,
  initialName,
}: {
  meId: string;
  isStaff: boolean;
  initialActiveId?: string | null;
  initialName?: string;
}) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(initialActiveId);

  const loadThreads = useCallback(async () => {
    if (!isStaff) return;
    try {
      const r = await fetch("/api/messages/threads", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      setThreads(j.threads || []);
    } catch {
      /* ignore */
    }
  }, [isStaff]);

  useEffect(() => {
    loadThreads();
    const t = setInterval(loadThreads, 5000);
    return () => clearInterval(t);
  }, [loadThreads]);

  if (!isStaff) {
    return (
      <div className="card h-[70vh] overflow-hidden p-0">
        <ChatThread meId={meId} headerName="AI Visa team" />
      </div>
    );
  }

  const active = threads.find((t) => t.applicant.id === activeId);

  return (
    <div className="card grid h-[72vh] grid-cols-1 overflow-hidden p-0 sm:grid-cols-[300px_1fr]">
      {/* Conversation list */}
      <aside className="hidden min-h-0 flex-col border-e border-ink-200 sm:flex">
        <div className="border-b border-ink-200 px-4 py-3 text-sm font-semibold text-ink-500">
          Conversations
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <p className="p-4 text-sm text-ink-400">No conversations yet.</p>
          ) : (
            threads.map((t) => (
              <button
                key={t.applicant.id}
                onClick={() => setActiveId(t.applicant.id)}
                className={`flex w-full items-start gap-3 border-b border-ink-100 px-4 py-3 text-start transition ${
                  activeId === t.applicant.id ? "bg-brand-50" : "hover:bg-ink-50"
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {t.applicant.fullName.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-ink-900">{t.applicant.fullName}</span>
                    {t.unread > 0 && (
                      <span className="shrink-0 rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white">
                        {t.unread}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-ink-400">{preview(t.lastMessage)}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Active chat */}
      <section className="min-h-0">
        {activeId ? (
          <ChatThread
            key={activeId}
            meId={meId}
            withId={activeId}
            headerName={active?.applicant.fullName ?? initialName}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-ink-400">
            {/* Mobile: show a simple list to pick from */}
            <div className="w-full sm:hidden">
              {threads.map((t) => (
                <button
                  key={t.applicant.id}
                  onClick={() => setActiveId(t.applicant.id)}
                  className="flex w-full items-center justify-between border-b border-ink-100 px-4 py-3 text-start"
                >
                  <span className="font-semibold text-ink-900">{t.applicant.fullName}</span>
                  {t.unread > 0 && (
                    <span className="rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white">
                      {t.unread}
                    </span>
                  )}
                </button>
              ))}
              {threads.length === 0 && <span>No conversations yet.</span>}
            </div>
            <span className="hidden sm:block">Select a conversation to start chatting.</span>
          </div>
        )}
      </section>
    </div>
  );
}
