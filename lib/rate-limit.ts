import { AppError } from "@/lib/errors";

const hits = new Map<string, { count: number; resetAt: number }>();
const tooMany = () => new AppError(429, "RATE_LIMITED", "Too many requests. Please wait a moment and try again.");
const live = (key: string) => {
  const e = hits.get(key);
  return e && e.resetAt > Date.now() ? e : undefined;
};

/** Count one hit in a fixed window; returns the new count. In-memory (per instance) — use Redis for multi-instance deployments. */
export function recordHit(key: string, windowMs = 60_000): number {
  const now = Date.now();
  const e = live(key);
  if (e) return ++e.count;
  hits.set(key, { count: 1, resetAt: now + windowMs });
  if (hits.size > 10_000) for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
  return 1;
}

/** Throw if the key is already at its limit, without counting (use with recordHit for "count failures only"). */
export function checkLimit(key: string, limit: number) {
  if ((live(key)?.count ?? 0) >= limit) throw tooMany();
}

/** Count a hit and throw once the limit is exceeded. */
export function rateLimit(key: string, limit: number, windowMs = 60_000) {
  if (recordHit(key, windowMs) > limit) throw tooMany();
}

export const resetRateLimits = () => hits.clear(); // tests

/** NB: x-forwarded-for is client-controlled unless a trusted proxy overwrites it, so per-IP limits are coarse. Per-account limits are the real brute-force defence. */
export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
