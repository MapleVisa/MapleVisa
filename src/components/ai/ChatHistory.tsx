"use client";

import { useEffect, useState } from "react";
import { useT } from "@/i18n/IntlProvider";
import type { ChatMsg } from "./ChatThread";

type Item = { id: string; title: string; updatedAt: string };

// History controls for a chat assistant: "+ New chat" + an expandable list of
// the user's saved conversations (for this kind/application/section).
export default function ChatHistory({
  kind,
  applicationId,
  sectionId,
  activeId,
  reloadSignal,
  onResume,
  onNew,
}: {
  kind: "copilot" | "advisor";
  applicationId?: string;
  sectionId?: string;
  activeId?: string;
  reloadSignal: number;
  onResume: (id: string, messages: ChatMsg[]) => void;
  onNew: () => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ kind });
    if (applicationId) params.set("applicationId", applicationId);
    if (sectionId) params.set("sectionId", sectionId);
    const res = await fetch(`/api/ai/conversations?${params.toString()}`);
    const json = await res.json().catch(() => ({}));
    setItems(Array.isArray(json.conversations) ? json.conversations : []);
    setLoading(false);
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reloadSignal]);

  async function resume(id: string) {
    const res = await fetch(`/api/ai/conversations/${id}`);
    const json = await res.json().catch(() => ({}));
    if (json.conversation) {
      onResume(id, (json.conversation.messages || []) as ChatMsg[]);
      setOpen(false);
    }
  }

  async function remove(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (id === activeId) onNew();
  }

  return (
    <div className="border-b border-ink-200 px-3 py-2">
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            onNew();
            setOpen(false);
          }}
          className="text-xs font-semibold text-brand-600 hover:underline"
        >
          + {t.ai.newChat}
        </button>
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-xs text-ink-500 hover:text-ink-700"
        >
          🕘 {t.ai.history}
        </button>
      </div>

      {open && (
        <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-ink-200 bg-ink-50/50 p-1">
          {loading ? (
            <p className="px-2 py-1.5 text-xs text-ink-400">…</p>
          ) : items.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-ink-400">{t.ai.noConversations}</p>
          ) : (
            items.map((i) => (
              <div
                key={i.id}
                className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white ${
                  i.id === activeId ? "bg-white font-medium" : ""
                }`}
              >
                <button
                  onClick={() => resume(i.id)}
                  className="flex-1 truncate text-start text-ink-700"
                  title={i.title}
                >
                  {i.title}
                </button>
                <button
                  onClick={(e) => remove(i.id, e)}
                  className="text-xs text-ink-300 hover:text-brand-600"
                  aria-label="Delete"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
