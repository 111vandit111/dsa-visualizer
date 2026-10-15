import { describe, expect, it } from "vitest";
import type { SeoEntry } from "./data";
import { buildSitemapEntries } from "./sitemap-entries";

const SITE = "https://example.com";

function entry(slug: string, overrides: Partial<SeoEntry> = {}): SeoEntry {
  return {
    slug,
    title: slug,
    difficulty: "Easy",
    kind: "question",
    tags: [],
    description: "",
    solutionCode: "",
    updatedAt: "2026-02-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildSitemapEntries", () => {
  it("returns only the home page, without lastModified, for an empty list", () => {
    const out = buildSitemapEntries([], SITE);
    expect(out).toEqual([{ url: SITE, changeFrequency: "weekly", priority: 1 }]);
  });

  it("puts home first with the newest update, then one entry per question", () => {
    const out = buildSitemapEntries(
      [entry("a", { updatedAt: "2026-01-01T00:00:00.000Z" }), entry("b", { updatedAt: "2026-03-01T00:00:00.000Z" })],
      SITE,
    );
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({ url: SITE, priority: 1, changeFrequency: "weekly" });
    expect(out[0].lastModified).toEqual(new Date("2026-03-01T00:00:00.000Z"));
    expect(out[1]).toMatchObject({ url: `${SITE}/q/a`, priority: 0.7, changeFrequency: "monthly" });
    expect(out[1].lastModified).toEqual(new Date("2026-01-01T00:00:00.000Z"));
  });

  it("gives algorithms a higher priority", () => {
    expect(buildSitemapEntries([entry("heap", { kind: "algorithm" })], SITE)[1].priority).toBe(0.8);
  });

  it("builds URLs from the site URL and slug only (Next escapes XML when serializing)", () => {
    const out = buildSitemapEntries([entry("a-b")], SITE);
    expect(out[1].url).toBe(`${SITE}/q/a-b`);
    expect(out.every((item) => !item.url.includes("&"))).toBe(true);
  });
});
