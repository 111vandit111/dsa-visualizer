export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_GLOBAL_MAX_ATTEMPTS = 20;
export const LOGIN_WINDOW_MS = 60_000;
const GLOBAL_KEY = "*";
const MAX_TRACKED_KEYS = 1000;

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  isAllowed: boolean;
  retryAfterSeconds: number;
}

const buckets = new Map<string, Bucket>();

function pruneExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function consume(key: string, max: number, now: number): RateLimitResult {
  const existing = buckets.get(key);
  const bucket = existing && existing.resetAt > now ? existing : { count: 0, resetAt: now + LOGIN_WINDOW_MS };
  bucket.count += 1;
  buckets.set(key, bucket);
  return { isAllowed: bucket.count <= max, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
}

// In-memory per-process throttle: a per-client bucket plus a global cap, so an attacker who
// rotates or spoofs client keys still cannot exceed LOGIN_GLOBAL_MAX_ATTEMPTS per window.
export function checkRateLimit(key: string, now?: number): RateLimitResult {
  const currentTime = now ?? Date.now();
  if (buckets.size > MAX_TRACKED_KEYS) pruneExpired(currentTime);
  const client = consume(key, LOGIN_MAX_ATTEMPTS, currentTime);
  const global = consume(GLOBAL_KEY, LOGIN_GLOBAL_MAX_ATTEMPTS, currentTime);
  return {
    isAllowed: client.isAllowed && global.isAllowed,
    retryAfterSeconds: Math.max(client.retryAfterSeconds, global.retryAfterSeconds),
  };
}
