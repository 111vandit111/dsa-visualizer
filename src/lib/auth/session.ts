import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE_NAME = "dsa_admin_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function sign(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

function readExpiry(payload: string): number | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const exp = typeof parsed === "object" && parsed !== null ? (parsed as { exp?: unknown }).exp : undefined;
    return typeof exp === "number" ? exp : null;
  } catch {
    return null;
  }
}

export function createSessionToken(secret: string, now?: number): string {
  const currentTime = now ?? Date.now();
  const payload = Buffer.from(JSON.stringify({ exp: currentTime + SESSION_TTL_MS })).toString("base64url");
  return `${payload}.${sign(payload, secret).toString("base64url")}`;
}

export function verifySessionToken(token: string, secret: string, now: number): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;
  const given = Buffer.from(signature, "base64url");
  const expected = sign(payload, secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;
  const exp = readExpiry(payload);
  return exp !== null && exp > now;
}
