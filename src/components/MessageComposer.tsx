"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Compose + send an in-app message.
 * - Staff use it with `toUserId` set (message a specific applicant).
 * - Applicants use it with no `toUserId` (message the staff team).
 */
export default function MessageComposer({
  toUserId,
  applicationId,
  title = "Send a message",
  placeholder = "Write your message…",
  withSubject = true,
}: {
  toUserId?: string;
  applicationId?: string;
  title?: string;
  placeholder?: string;
  withSubject?: boolean;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function send() {
    if (!body.trim()) {
      setError("Please write a message.");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: body.trim(),
        subject: subject.trim() || undefined,
        toUserId,
        applicationId,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Could not send the message.");
      return;
    }
    setSubject("");
    setBody("");
    setSent(true);
    setTimeout(() => setSent(false), 3000);
    router.refresh();
  }

  return (
    <div className="card p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">{title}</h3>
      {error && <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{error}</p>}
      {sent && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Message sent.</p>
      )}
      {withSubject && (
        <div className="mt-4">
          <label className="label">Subject (optional)</label>
          <input
            className="input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Update on your application"
          />
        </div>
      )}
      <div className="mt-4">
        <label className="label">Message</label>
        <textarea
          className="input min-h-[100px]"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={placeholder}
        />
      </div>
      <button onClick={send} disabled={busy} className="btn-primary mt-3 w-full">
        {busy ? "Sending…" : "Send message"}
      </button>
    </div>
  );
}
