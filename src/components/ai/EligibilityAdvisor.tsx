"use client";

import { useState } from "react";
import { useT } from "@/i18n/IntlProvider";
import ChatThread, { type ChatMsg } from "./ChatThread";
import ChatHistory from "./ChatHistory";

export default function EligibilityAdvisor() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [reloadSignal, setReloadSignal] = useState(0);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    const res = await fetch("/api/ai/eligibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: next, conversationId }),
    });
    setBusy(false);
    if (res.status === 503) {
      setNotConfigured(true);
      return;
    }
    const json = await res.json().catch(() => ({}));
    if (json.reply) {
      setMessages([...next, { role: "model", content: json.reply }]);
    } else {
      setMessages([...next, { role: "model", content: json.error || "…" }]);
    }
    if (json.conversationId) {
      setConversationId(json.conversationId);
      setReloadSignal((n) => n + 1);
    }
  }

  function newChat() {
    setMessages([]);
    setConversationId(undefined);
    setInput("");
  }

  function resumeChat(id: string, msgs: ChatMsg[]) {
    setMessages(msgs);
    setConversationId(id);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary gap-2">
        <span>✨</span> {t.apply.askAdvisor}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-0 sm:items-center sm:p-4">
          <div className="flex h-[90vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-card sm:h-[80vh] sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">✨</span>
                <h3 className="font-bold text-ink-900">{t.ai.advisorTitle}</h3>
              </div>
              <button onClick={() => setOpen(false)} className="btn-ghost px-2">✕</button>
            </div>

            {!notConfigured && (
              <ChatHistory
                kind="advisor"
                activeId={conversationId}
                reloadSignal={reloadSignal}
                onResume={resumeChat}
                onNew={newChat}
              />
            )}

            <div className="flex-1 overflow-auto px-5 py-4">
              {notConfigured ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  {t.ai.notConfigured}
                </div>
              ) : messages.length === 0 ? (
                <p className="rounded-2xl bg-ink-100 px-3.5 py-2.5 text-sm text-ink-600">
                  {t.ai.advisorIntro}
                </p>
              ) : (
                <ChatThread messages={messages} busy={busy} thinkingLabel={t.ai.thinking} />
              )}
            </div>

            <div className="border-t border-ink-200 p-3">
              <p className="mb-2 px-1 text-[11px] text-ink-400">{t.ai.disclaimer}</p>
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  disabled={notConfigured}
                  placeholder={t.ai.askPlaceholder}
                  className="input"
                />
                <button onClick={send} disabled={busy || notConfigured} className="btn-primary px-4">
                  {t.common.send}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
