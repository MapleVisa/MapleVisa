"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setBusy(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-4xl">📩</div>
        <p className="text-sm text-ink-600">
          If an account exists for <span className="font-semibold">{email}</span>, we've sent a
          password-reset link. Check your inbox.
        </p>
        <Link href="/login" className="block text-sm font-semibold text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          placeholder="you@example.com"
        />
      </div>
      <button type="submit" disabled={busy} className="btn-primary w-full py-3">
        {busy ? "Sending…" : "Send reset link"}
      </button>
      <Link href="/login" className="block text-center text-sm font-semibold text-brand-600 hover:underline">
        Back to sign in
      </Link>
    </form>
  );
}
