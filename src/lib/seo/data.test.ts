import { beforeEach, describe, expect, it, vi } from "vitest";

const getBySlug = vi.fn();
const listForSeo = vi.fn();
const logError = vi.fn();

vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/lib/questions/repository", () => ({
  getBySlug: (...args: unknown[]) => getBySlug(...args),
  listForSeo: () => listForSeo(),
}));
vi.mock("@/lib/logger", () => ({ logger: { error: (...args: unknown[]) => logError(...args) } }));

import { listSeoEntries, lookupQuestion, QUESTIONS_CACHE_TAG } from "./data";

beforeEach(() => vi.clearAllMocks());

const row = (slug: string, title: string, kind: "algorithm" | "question") => ({
  slug,
  title,
  kind,
  difficulty: "Easy" as const,
  tags: [],
  description: "",
  solutionCode: "",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

describe("lookupQuestion", () => {
  it("rejects invalid slugs without touching the database", async () => {
    for (const slug of ["", "Bad Slug", "../etc", "a--b", "x".repeat(200)]) {
      expect(await lookupQuestion(slug)).toEqual({ status: "missing" });
    }
    expect(getBySlug).not.toHaveBeenCalled();
  });

  it("returns found or missing", async () => {
    getBySlug.mockResolvedValueOnce({ slug: "two-sum" });
    expect(await lookupQuestion("two-sum")).toEqual({ status: "found", question: { slug: "two-sum" } });
    getBySlug.mockResolvedValueOnce(null);
    expect(await lookupQuestion("nope")).toEqual({ status: "missing" });
  });

  it("returns unavailable and logs when the database fails", async () => {
    getBySlug.mockRejectedValueOnce(new Error("down"));
    expect(await lookupQuestion("two-sum")).toEqual({ status: "unavailable" });
    expect(logError).toHaveBeenCalledWith("SEO question lookup failed", expect.objectContaining({ slug: "two-sum" }));
  });
});

describe("listSeoEntries", () => {
  it("sorts algorithms first, then by title", async () => {
    listForSeo.mockResolvedValueOnce([row("z", "Zeta", "question"), row("b", "beta", "algorithm"), row("a", "Alpha", "question")]);
    expect((await listSeoEntries()).map((entry) => entry.slug)).toEqual(["b", "a", "z"]);
  });

  it("returns [] and logs when the database fails", async () => {
    listForSeo.mockRejectedValueOnce(new Error("down"));
    expect(await listSeoEntries()).toEqual([]);
    expect(logError).toHaveBeenCalled();
  });
});

it("exports the shared cache tag", () => {
  expect(QUESTIONS_CACHE_TAG).toBe("questions");
});
