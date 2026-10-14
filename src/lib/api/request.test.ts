import { afterEach, describe, expect, it, vi } from "vitest";
import { exceedsJsonDepth, getClientKey, MAX_JSON_DEPTH, readJsonBody } from "./request";
import { ApiHttpError } from "./response";

function nested(depth: number): unknown {
  let value: unknown = 1;
  for (let i = 0; i < depth; i++) value = [value];
  return value;
}

function jsonRequest(body: string): Request {
  return new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json" }, body });
}

afterEach(() => vi.unstubAllEnvs());

describe("exceedsJsonDepth", () => {
  it("accepts shallow values and rejects deep ones", () => {
    expect(exceedsJsonDepth(nested(10), MAX_JSON_DEPTH)).toBe(false);
    expect(exceedsJsonDepth(nested(MAX_JSON_DEPTH + 5), MAX_JSON_DEPTH)).toBe(true);
    expect(exceedsJsonDepth({ a: [{ b: 1 }] }, 2)).toBe(true);
    expect(exceedsJsonDepth("text", 1)).toBe(false);
  });
});

describe("readJsonBody", () => {
  it("returns parsed JSON", async () => {
    expect(await readJsonBody(jsonRequest('{"a":1}'))).toEqual({ a: 1 });
  });

  it("rejects very deeply nested JSON with a 400", async () => {
    const text = "[".repeat(3000) + "]".repeat(3000);
    await expect(readJsonBody(jsonRequest(text))).rejects.toMatchObject({ status: 400 });
    await expect(readJsonBody(jsonRequest(text))).rejects.toBeInstanceOf(ApiHttpError);
  });
});

describe("getClientKey", () => {
  const request = new Request("http://localhost/api", {
    headers: { "x-forwarded-for": "6.6.6.6, 10.0.0.1", "x-real-ip": "9.9.9.9" },
  });

  it("ignores forwarding headers unless the proxy is trusted", () => {
    expect(getClientKey(request)).toBe("direct");
  });

  it("uses x-real-ip, then the rightmost forwarded hop, when trusted", () => {
    vi.stubEnv("TRUST_PROXY", "true");
    expect(getClientKey(request)).toBe("9.9.9.9");
    const forwardedOnly = new Request("http://localhost/api", { headers: { "x-forwarded-for": "6.6.6.6, 10.0.0.1" } });
    expect(getClientKey(forwardedOnly)).toBe("10.0.0.1");
    expect(getClientKey(new Request("http://localhost/api"))).toBe("direct");
  });
});
