"use client";

import { useRef, useState } from "react";

// Picks an audio MIME the browser can actually record.
function pickAudioMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const c of ["audio/webm", "audio/mp4", "audio/ogg"]) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c;
    } catch {
      /* ignore */
    }
  }
  return "";
}

export default function Composer({
  toUserId,
  onSent,
}: {
  toUserId?: string; // set when staff message a specific applicant
  onSent: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef(0);

  async function post(form: FormData | string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        ...(typeof form === "string"
          ? { headers: { "Content-Type": "application/json" }, body: form }
          : { body: form }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Could not send.");
        return;
      }
      onSent();
    } finally {
      setBusy(false);
    }
  }

  function sendText() {
    const body = text.trim();
    if (!body) return;
    setText("");
    post(JSON.stringify({ body, ...(toUserId ? { toUserId } : {}) }));
  }

  function sendFile(file: File, kind: "FILE" | "VOICE", durationSec?: number) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    if (toUserId) fd.append("toUserId", toUserId);
    if (durationSec) fd.append("durationSec", String(durationSec));
    post(fd);
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) sendFile(f, "FILE");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function startRecording() {
    setError("");
    const mime = pickAudioMime();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (ev) => ev.data.size && chunksRef.current.push(ev.data);
      mr.onstop = () => {
        const type = mr.mimeType || mime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        const dur = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
        sendFile(new File([blob], `voice.${ext}`, { type }), "VOICE", dur);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      recRef.current = mr;
      startedAt.current = Date.now();
      setElapsed(0);
      setRecording(true);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch {
      setError("Microphone access was blocked. Allow it in your browser to send a voice note.");
    }
  }

  function stopRecording(cancel = false) {
    if (timerRef.current) clearInterval(timerRef.current);
    const mr = recRef.current;
    setRecording(false);
    if (!mr) return;
    if (cancel) mr.onstop = () => mr.stream.getTracks().forEach((t) => t.stop());
    mr.stop();
    recRef.current = null;
  }

  return (
    <div className="border-t border-ink-200 bg-white p-3">
      {error && <p className="mb-2 text-xs text-brand-600">{error}</p>}

      {recording ? (
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-red-600">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" />
            Recording {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
            {String(elapsed % 60).padStart(2, "0")}
          </span>
          <div className="ms-auto flex gap-2">
            <button onClick={() => stopRecording(true)} className="btn-ghost px-3 py-1.5 text-sm">
              Cancel
            </button>
            <button onClick={() => stopRecording(false)} disabled={busy} className="btn-primary px-4 py-1.5 text-sm">
              Send
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={onPickFile} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            title="Attach a document"
            className="btn-ghost h-10 w-10 shrink-0 p-0 text-lg"
          >
            📎
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendText();
              }
            }}
            rows={1}
            placeholder="Type a message…"
            className="input max-h-32 min-h-[40px] flex-1 resize-none py-2"
          />
          {text.trim() ? (
            <button onClick={sendText} disabled={busy} className="btn-primary h-10 shrink-0 px-4">
              Send
            </button>
          ) : (
            <button
              onClick={startRecording}
              disabled={busy}
              title="Record a voice note"
              className="btn-ghost h-10 w-10 shrink-0 p-0 text-lg"
            >
              🎤
            </button>
          )}
        </div>
      )}
    </div>
  );
}
