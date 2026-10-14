import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, getQuestion } from "./client";

function stubFetch(response: Response): void {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
}

afterEach(() => vi.unstubAllGlobals());

describe("api client envelope handling", () => {
  it("unwraps data", async () => {
    stubFetch(Response.json({ data: { slug: "a" } }));
    await expect(getQuestion("a")).resolves.toEqual({ slug: "a" });
  });

  it("throws ApiError for an ok response that is not JSON", async () => {
    stubFetch(new Response("<html>oops</html>", { status: 200 }));
    await expect(getQuestion("a")).rejects.toBeInstanceOf(ApiError);
  });

  it("throws ApiError for an ok response without data", async () => {
    stubFetch(Response.json({}));
    await expect(getQuestion("a")).rejects.toBeInstanceOf(ApiError);
  });

  it("maps error envelopes", async () => {
    stubFetch(Response.json({ error: { code: "not_found", message: "nope" } }, { status: 404 }));
    await expect(getQuestion("a")).rejects.toMatchObject({ status: 404, code: "not_found" });
  });
});
