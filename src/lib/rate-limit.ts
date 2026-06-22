import "server-only";

/**
 * Lightweight fixed-window rate limiter.
 *
 * In production (serverless), set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * so counters are shared across all instances. Without them it falls back to an
 * in-memory map, which is fine for local dev / a single long-running server but
 * does NOT limit reliably across serverless invocations.
 */

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = !!(url && token);

const memory = new Map<string, { count: number; resetAt: number }>();

export type RateResult = { ok: boolean; remaining: number; retryAfter: number };

/**
 * @param key      Unique bucket, e.g. `login:1.2.3.4` or `ai:userId`.
 * @param limit    Max requests allowed within the window.
 * @param windowSec Window length in seconds.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateResult> {
  if (useRedis) {
    try {
      // INCR then set EXPIRE on first hit, via Upstash REST pipeline.
      const res = await fetch(`${url}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify([
          ["INCR", key],
          ["EXPIRE", key, String(windowSec), "NX"],
          ["TTL", key],
        ]),
        cache: "no-store",
      });
      const data = (await res.json()) as Array<{ result: number }>;
      const count = data[0]?.result ?? 1;
      const ttl = data[2]?.result ?? windowSec;
      return {
        ok: count <= limit,
        remaining: Math.max(0, limit - count),
        retryAfter: count <= limit ? 0 : Math.max(1, ttl),
      };
    } catch {
      // Fail open on limiter errors rather than locking users out.
      return { ok: true, remaining: limit, retryAfter: 0 };
    }
  }

  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  entry.count += 1;
  const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
  return { ok: entry.count <= limit, remaining: Math.max(0, limit - entry.count), retryAfter };
}

/** Best-effort client IP from common proxy headers. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/** Standard 429 response with a Retry-After header. */
export function tooMany(retryAfter: number): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please slow down and try again shortly." }),
    { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(retryAfter) } }
  );
}
