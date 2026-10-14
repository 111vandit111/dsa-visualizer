import { describe, expect, it } from "vitest";
import { createSessionToken, SESSION_TTL_MS, verifySessionToken } from "./session";

const SECRET = "a".repeat(32);
const NOW = 1_700_000_000_000;

describe("session token", () => {
  it("accepts a freshly created token", () => {
    const token = createSessionToken(SECRET, NOW);
    expect(verifySessionToken(token, SECRET, NOW + 1000)).toBe(true);
  });

  it("rejects a tampered payload", () => {
    const [, signature] = createSessionToken(SECRET, NOW).split(".");
    const forged = Buffer.from(JSON.stringify({ exp: NOW + SESSION_TTL_MS * 10 })).toString("base64url");
    expect(verifySessionToken(`${forged}.${signature}`, SECRET, NOW)).toBe(false);
  });

  it("rejects a tampered signature", () => {
    const [payload, signature] = createSessionToken(SECRET, NOW).split(".");
    const flipped = (signature[0] === "A" ? "B" : "A") + signature.slice(1);
    expect(verifySessionToken(`${payload}.${flipped}`, SECRET, NOW)).toBe(false);
  });

  it("rejects an expired token", () => {
    const token = createSessionToken(SECRET, NOW);
    expect(verifySessionToken(token, SECRET, NOW + SESSION_TTL_MS + 1)).toBe(false);
  });

  it("rejects a token signed with another secret", () => {
    const token = createSessionToken("b".repeat(32), NOW);
    expect(verifySessionToken(token, SECRET, NOW)).toBe(false);
  });

  it("rejects malformed input", () => {
    expect(verifySessionToken("", SECRET, NOW)).toBe(false);
    expect(verifySessionToken("abc", SECRET, NOW)).toBe(false);
    expect(verifySessionToken("a.b.c", SECRET, NOW)).toBe(false);
  });
});
