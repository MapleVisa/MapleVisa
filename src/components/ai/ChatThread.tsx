"use client";

import { useEffect, useRef } from "react";

export type ChatMsg = { role: "user" | "model"; content: string };

export default function ChatThread({
  messages,
  busy,
  thinkingLabel,
}: {
  messages: ChatMsg[];
  busy: boolean;
  thinkingLabel: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  return (
    <div className="space-y-3">
      {messages.map((m, i) => (
        <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
          <div
            className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              m.role === "user"
                ? "bg-brand-600 text-white"
                : "bg-ink-100 text-ink-800"
            }`}
          >
            {m.content}
          </div>
        </div>
      ))}
      {busy && (
        <div className="flex justify-start">
          <div className="rounded-2xl bg-ink-100 px-3.5 py-2.5 text-sm text-ink-500">
            {thinkingLabel}
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
