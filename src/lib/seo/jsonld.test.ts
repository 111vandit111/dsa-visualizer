import { afterEach, describe, expect, it, vi } from "vitest";
import type { Question } from "@/lib/types/question";
import { questionJsonLd, serializeJsonLd, siteJsonLd } from "./jsonld";

const SITE = "https://example.com";

afterEach(() => vi.unstubAllEnvs());

function question(overrides: Partial<Question> = {}): Question {
  return {
    id: "1",
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    kind: "question",
    tags: ["array", "hash-map"],
    description: "Find **two** numbers that add up to a target.",
    solutionCode: "function f() {}",
    testCases: [],
    visualHints: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("serializeJsonLd", () => {
  it("escapes < and JS line terminators so the output is safe in a script tag", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>\u2028\u2029" });
    expect(out).not.toContain("<");
    expect(out).not.toContain("\u2028");
    expect(out).not.toContain("\u2029");
    expect(JSON.parse(out)).toEqual({ name: "</script><script>alert(1)</script>\u2028\u2029" });
  });

  it("serializes arrays", () => {
    expect(JSON.parse(serializeJsonLd([{ a: 1 }, { b: 2 }]))).toEqual([{ a: 1 }, { b: 2 }]);
  });
});

describe("siteJsonLd", () => {
  it("links Organization and WebSite and declares a search action", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE);
    const graph = (siteJsonLd()["@graph"] as Record<string, unknown>[]);
    const [org, website] = graph;
    expect(org["@id"]).toBe(`${SITE}/#organization`);
    expect(org.logo).toBe(`${SITE}/icon`);
    expect(website["@id"]).toBe(`${SITE}/#website`);
    expect(website.publisher).toEqual({ "@id": `${SITE}/#organization` });
    expect(website.potentialAction).toMatchObject({
      "@type": "SearchAction",
      target: `${SITE}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    });
  });
});

describe("questionJsonLd", () => {
  it("builds a TechArticle and breadcrumb with absolute URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE);
    const [article, crumbs] = questionJsonLd(question())["@graph"] as Record<string, unknown>[];
    expect(article["@type"]).toEqual(["TechArticle", "LearningResource"]);
    expect(article["@id"]).toBe(`${SITE}/q/two-sum#article`);
    expect(article.headline).toBe("Two Sum");
    expect(article.description).toBe("Find two numbers that add up to a target.");
    expect(article.keywords).toBe("array, hash-map");
    expect(article.proficiencyLevel).toBe("Beginner");
    expect(article.educationalLevel).toBe("Beginner");
    expect(article.datePublished).toBe("2026-01-01T00:00:00.000Z");
    expect(article.dateModified).toBe("2026-02-01T00:00:00.000Z");
    expect(article.isPartOf).toEqual({ "@id": `${SITE}/#website` });
    expect(crumbs.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Two Sum", item: `${SITE}/q/two-sum` },
    ]);
  });

  it("maps difficulty to proficiency level", () => {
    const level = (difficulty: Question["difficulty"]) =>
      ((questionJsonLd(question({ difficulty }))["@graph"] as Record<string, unknown>[])[0]).proficiencyLevel;
    expect(level("Medium")).toBe("Intermediate");
    expect(level("Hard")).toBe("Expert");
  });

  it("survives a hostile title when serialized", () => {
    const out = serializeJsonLd(questionJsonLd(question({ title: "</script><img src=x onerror=alert(1)>" })));
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<");
  });

  it("handles an empty description and no tags", () => {
    const [article] = questionJsonLd(question({ description: "", tags: [] }))["@graph"] as Record<string, unknown>[];
    expect(article.description).toBe("");
    expect(article.keywords).toBe("");
  });
});
