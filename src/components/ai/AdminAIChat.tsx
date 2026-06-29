"use client";

import { useState } from "react";
import ChatThread, { type ChatMsg } from "./ChatThread";
import ChatHistory from "./ChatHistory";

// Inline AI assistant for staff (same advisor model as applicants), saved per
// user so admins/lawyers can keep and resume their own chats.
export default function AdminAIChat() {
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
    setMessages([...next, { role: "model", content: json.reply || json.error || "…" }]);
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
    <div className="card flex h-[72vh] flex-col overflow-hidden p-0">
      {!notConfigured && (
        <ChatHistory
          kind="advisor"
          activeId={conversationId}
          reloadSignal={reloadSignal}
          onResume={resumeChat}
          onNew={newChat}
        />
      )}

      <div className="flex-1 overflow-auto p-4">
        {notConfigured ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            The AI provider isn’t configured.
          </div>
        ) : messages.length === 0 ? (
          <p className="rounded-2xl bg-ink-100 px-3.5 py-2.5 text-sm text-ink-600">
            Ask anything about Canadian immigration programs, eligibility, documents or a case.
          </p>
        ) : (
          <ChatThread messages={messages} busy={busy} thinkingLabel="Thinking…" />
        )}
      </div>

      <div className="border-t border-ink-200 p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            disabled={notConfigured}
            placeholder="Ask the assistant…"
            className="input"
          />
          <button onClick={send} disabled={busy || notConfigured} className="btn-primary px-4">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
