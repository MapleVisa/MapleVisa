import "server-only";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "AI Visa <onboarding@resend.dev>";

export const emailConfigured = !!RESEND_API_KEY;

/** Absolute base URL for building links in emails. */
export function baseUrl(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  if (!RESEND_API_KEY) {
    // Don't block signup in dev; log the content so links are testable.
    console.warn("[email] RESEND_API_KEY not set — email not sent to", opts.to);
    if (process.env.NODE_ENV !== "production") console.log(`[email:${opts.subject}]`, opts.html);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: EMAIL_FROM, to: [opts.to], subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) {
      console.error("[email] send failed", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] send error", e);
    return false;
  }
}

function shell(title: string, intro: string, buttonLabel: string, link: string, footer: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
    <div style="font-size:20px;font-weight:bold;color:#A32D2D;margin-bottom:16px">🍁 AI Visa</div>
    <h1 style="font-size:18px;margin:0 0 8px">${title}</h1>
    <p style="font-size:14px;line-height:1.6;color:#374151">${intro}</p>
    <p style="margin:24px 0"><a href="${link}" style="background:#A32D2D;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-size:14px;font-weight:bold;display:inline-block">${buttonLabel}</a></p>
    <p style="font-size:12px;color:#6b7280;line-height:1.6">${footer}</p>
    <p style="font-size:12px;color:#9ca3af;word-break:break-all">Or paste this link: ${link}</p>
  </div>`;
}

export function sendVerificationEmail(to: string, link: string) {
  return sendEmail({
    to,
    subject: "Verify your email · AI Visa",
    html: shell(
      "Confirm your email address",
      "Welcome to AI Visa. Please confirm your email address to activate your account and sign in.",
      "Verify email",
      link,
      "This link expires in 24 hours. If you didn't create an account, you can ignore this email."
    ),
  });
}

export function sendResetEmail(to: string, link: string) {
  return sendEmail({
    to,
    subject: "Reset your password · AI Visa",
    html: shell(
      "Reset your password",
      "We received a request to reset your AI Visa password. Click below to choose a new one.",
      "Reset password",
      link,
      "This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change."
    ),
  });
}
