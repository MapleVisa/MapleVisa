"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/IntlProvider";
import PasswordStrength from "./PasswordStrength";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const t = useT();
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verifySent, setVerifySent] = useState(false);
  const [showResend, setShowResend] = useState(false);

  // Success/error flags from verify + reset redirects (login page only).
  useEffect(() => {
    if (mode !== "login") return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("verified")) setInfo("Your email is verified. You can sign in now.");
    else if (p.get("reset")) setInfo("Your password has been updated. Please sign in.");
    else if (p.get("verify_error")) setError("That verification link is invalid or has expired. Sign in to get a new one.");
  }, [mode]);

  async function resend() {
    setError("");
    await fetch("/api/auth/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setInfo("If that account needs verification, we've sent a new link.");
    setShowResend(false);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());

    const url = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(json.error || "Something went wrong. Please try again.");
      if (json.code === "EMAIL_NOT_VERIFIED") setShowResend(true);
      return;
    }

    if (mode === "signup" && json.verify) {
      setVerifySent(true);
      return;
    }

    if (json.role === "ADMIN" || json.role === "LAWYER") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  }

  if (verifySent) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-4xl">📩</div>
        <h2 className="text-lg font-bold text-ink-900">Check your email</h2>
        <p className="text-sm text-ink-500">
          We sent a verification link to <span className="font-semibold text-ink-700">{email}</span>.
          Click it to activate your account, then sign in.
        </p>
        <button onClick={resend} className="btn-secondary w-full">Resend verification email</button>
        <Link href="/login" className="block text-sm font-semibold text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {info && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {info}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          {error}
          {showResend && (
            <button type="button" onClick={resend} className="ms-2 font-semibold underline">
              Resend verification email
            </button>
          )}
        </div>
      )}

      {mode === "signup" && (
        <div>
          <label className="label" htmlFor="fullName">{t.auth.fullName}</label>
          <input id="fullName" name="fullName" className="input" required placeholder="John Smith" />
        </div>
      )}

      <div>
        <label className="label" htmlFor="email">{t.auth.email}</label>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {mode === "signup" && (
        <div>
          <label className="label" htmlFor="phone">
            {t.auth.phone} <span className="font-normal text-ink-400">{t.auth.optional}</span>
          </label>
          <input id="phone" name="phone" type="tel" className="input" placeholder="+1 555 123 4567" />
        </div>
      )}

      <div>
        <label className="label" htmlFor="password">{t.auth.password}</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          required
          minLength={mode === "signup" ? 8 : undefined}
          placeholder={mode === "signup" ? t.auth.passwordHint : "••••••••"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === "signup" && <PasswordStrength password={password} />}
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full py-3">
        {loading ? t.common.loading : mode === "signup" ? t.common.signup : t.common.login}
      </button>

      {mode === "login" && (
        <p className="text-center">
          <Link href="/forgot" className="text-sm font-semibold text-brand-600 hover:underline">
            Forgot password?
          </Link>
        </p>
      )}

      <p className="text-center text-sm text-ink-500">
        {mode === "signup" ? (
          <>
            {t.auth.haveAccount}{" "}
            <Link href="/login" className="font-semibold text-brand-600 hover:underline">{t.common.login}</Link>
          </>
        ) : (
          <>
            {t.auth.noAccount}{" "}
            <Link href="/signup" className="font-semibold text-brand-600 hover:underline">{t.common.signup}</Link>
          </>
        )}
      </p>
    </form>
  );
}
