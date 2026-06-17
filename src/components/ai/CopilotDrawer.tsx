"use client";

import { useState } from "react";
import { useT } from "@/i18n/IntlProvider";
import ChatThread, { type ChatMsg } from "./ChatThread";
import ChatHistory from "./ChatHistory";

export default function CopilotDrawer({
  program,
  applicationId,
  sectionId,
  sectionTitle,
  onApply,
}: {
  program: string;
  applicationId: string;
  sectionId: string;
  sectionTitle: string;
  onApply: (values: Record<string, any>) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"ask" | "fill">("ask");
  const [notConfigured, setNotConfigured] = useState(false);

  // Ask mode
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [reloadSignal, setReloadSignal] = useState(0);

  // Fill mode
  const [desc, setDesc] = useState("");
  const [filling, setFilling] = useState(false);
  const [suggestion, setSuggestion] = useState<{ values: Record<string, any>; note: string } | null>(null);

  async function ask() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    const res = await fetch("/api/ai/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "ask", program, applicationId, sectionId, messages: next, conversationId }),
    });
    setBusy(false);
    if (res.status === 503) return setNotConfigured(true);
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
    setTab("ask");
  }

  async function fill() {
    const text = desc.trim();
    if (!text || filling) return;
    setFilling(true);
    setSuggestion(null);
    const res = await fetch("/api/ai/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "fill", program, sectionId, description: text }),
    });
    setFilling(false);
    if (res.status === 503) return setNotConfigured(true);
    const json = await res.json().catch(() => ({}));
    if (json.values) setSuggestion({ values: json.values, note: json.note || "" });
  }

  function applySuggestion() {
    if (suggestion) onApply(suggestion.values);
    setSuggestion(null);
    setDesc("");
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 end-5 z-40 flex items-center gap-2 rounded-full bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700"
      >
        <span>✨</span> {t.ai.openAssistant}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink-900/40">
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">✨</span>
                <div>
                  <h3 className="font-bold text-ink-900">{t.ai.copilotTitle}</h3>
                  <p className="text-xs text-ink-400">{sectionTitle}</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="btn-ghost px-2">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-ink-200 px-3 pt-2">
              <button
                onClick={() => setTab("ask")}
                className={`rounded-t-lg px-3 py-2 text-sm font-medium ${tab === "ask" ? "bg-brand-50 text-brand-700" : "text-ink-500 hover:bg-ink-50"}`}
              >
                💬 {t.ai.assistant}
              </button>
              <button
                onClick={() => setTab("fill")}
                className={`rounded-t-lg px-3 py-2 text-sm font-medium ${tab === "fill" ? "bg-brand-50 text-brand-700" : "text-ink-500 hover:bg-ink-50"}`}
              >
                ⚡ {t.ai.autofill}
              </button>
            </div>

            {notConfigured ? (
              <div className="m-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                {t.ai.notConfigured}
              </div>
            ) : tab === "ask" ? (
              <>
                <ChatHistory
                  kind="copilot"
                  applicationId={applicationId}
                  sectionId={sectionId}
                  activeId={conversationId}
                  reloadSignal={reloadSignal}
                  onResume={resumeChat}
                  onNew={newChat}
                />
                <div className="flex-1 overflow-auto px-5 py-4">
                  {messages.length === 0 ? (
                    <p className="rounded-2xl bg-ink-100 px-3.5 py-2.5 text-sm text-ink-600">
                      {t.ai.copilotIntro}
                    </p>
                  ) : (
                    <ChatThread messages={messages} busy={busy} thinkingLabel={t.ai.thinking} />
                  )}
                </div>
                <div className="border-t border-ink-200 p-3">
                  <div className="flex gap-2">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && ask()}
                      placeholder={t.ai.askPlaceholder}
                      className="input"
                    />
                    <button onClick={ask} disabled={busy} className="btn-primary px-4">
                      {t.common.send}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-auto px-5 py-4">
                <p className="text-sm text-ink-600">{t.ai.fillFromText}</p>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="input mt-2 min-h-[120px]"
                  placeholder="…"
                />
                <button onClick={fill} disabled={filling} className="btn-primary mt-3 w-full">
                  {filling ? t.ai.thinking : t.ai.autofill}
                </button>

                {suggestion && (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    {suggestion.note && <p className="text-sm text-emerald-800">{suggestion.note}</p>}
                    <ul className="mt-2 space-y-1 text-xs text-ink-600">
                      {Object.entries(suggestion.values).map(([k, v]) => (
                        <li key={k}>
                          <span className="font-mono text-ink-400">{k}</span>: {String(v)}
                        </li>
                      ))}
                    </ul>
                    <button onClick={applySuggestion} className="btn-primary mt-3 w-full">
                      {t.ai.applySuggestions}
                    </button>
                  </div>
                )}
                <p className="mt-3 text-[11px] text-ink-400">{t.ai.disclaimer}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
