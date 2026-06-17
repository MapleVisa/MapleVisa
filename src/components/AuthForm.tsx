"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/i18n/IntlProvider";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const t = useT();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
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
      return;
    }

    if (mode === "login" && (json.role === "ADMIN" || json.role === "LAWYER")) {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          {error}
        </div>
      )}

      {mode === "signup" && (
        <div>
          <label className="label" htmlFor="fullName">
            {t.auth.fullName}
          </label>
          <input id="fullName" name="fullName" className="input" required placeholder="Hamed Izadian" />
        </div>
      )}

      <div>
        <label className="label" htmlFor="email">
          {t.auth.email}
        </label>
        <input id="email" name="email" type="email" className="input" required placeholder="you@example.com" />
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
        <label className="label" htmlFor="password">
          {t.auth.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          required
          minLength={mode === "signup" ? 8 : undefined}
          placeholder={mode === "signup" ? t.auth.passwordHint : "••••••••"}
        />
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full py-3">
        {loading ? t.common.loading : mode === "signup" ? t.common.signup : t.common.login}
      </button>

      <p className="text-center text-sm text-ink-500">
        {mode === "signup" ? (
          <>
            {t.auth.haveAccount}{" "}
            <Link href="/login" className="font-semibold text-brand-600 hover:underline">
              {t.common.login}
            </Link>
          </>
        ) : (
          <>
            {t.auth.noAccount}{" "}
            <Link href="/signup" className="font-semibold text-brand-600 hover:underline">
              {t.common.signup}
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
