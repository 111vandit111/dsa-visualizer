import { describe, expect, it } from "vitest";
import type { SeoEntry } from "./data";
import { renderLlmsFullTxt, renderLlmsTxt, TEXT_CACHE_CONTROL } from "./llms";

const SITE = "https://example.com";

function entry(overrides: Partial<SeoEntry> = {}): SeoEntry {
  return {
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    kind: "question",
    tags: ["array"],
    description: "Find **two** numbers.\n\nSecond paragraph.",
    solutionCode: "function twoSum() {}",
    updatedAt: "2026-02-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("renderLlmsTxt", () => {
  it("renders a valid skeleton for an empty list", () => {
    const out = renderLlmsTxt([], SITE);
    expect(out.startsWith("# DSA Visualizer\n\n> ")).toBe(true);
    expect(out).toContain("## Optional");
    expect(out).not.toContain("## Algorithms");
    expect(out).not.toContain("## Practice problems");
    expect(out.endsWith("\n")).toBe(true);
  });

  it("groups entries by kind with absolute links and markdown-free descriptions", () => {
    const out = renderLlmsTxt([entry({ slug: "binary-search", title: "Binary Search", kind: "algorithm" }), entry()], SITE);
    expect(out).toContain("## Algorithms\n\n- [Binary Search](https://example.com/q/binary-search):");
    expect(out).toContain("## Practice problems\n\n- [Two Sum](https://example.com/q/two-sum): Find two numbers. Second paragraph.");
    expect(out).toContain(`(${SITE}/llms-full.txt)`);
  });

  it("neutralizes newlines and link breakers in titles", () => {
    const out = renderLlmsTxt([entry({ title: "Evil]\n(x)\n## Injected [a](b)" })], SITE);
    const line = out.split("\n").find((l) => l.includes("Evil"));
    expect(line).toBeDefined();
    expect(line).toContain("[Evil\\]");
    expect(out).not.toMatch(/^## Injected/m);
    expect(out.split("\n").filter((l) => l.startsWith("- [")).length).toBe(3);
  });

  it("omits the description separator when there is no description", () => {
    expect(renderLlmsTxt([entry({ description: "" })], SITE)).toContain("- [Two Sum](https://example.com/q/two-sum)\n");
  });

  it("truncates long descriptions", () => {
    const out = renderLlmsTxt([entry({ description: "word ".repeat(500) })], SITE);
    const line = out.split("\n").find((l) => l.startsWith("- [Two Sum]")) ?? "";
    expect(line.length).toBeLessThan(250);
    expect(line.endsWith("…")).toBe(true);
  });
});

describe("renderLlmsFullTxt", () => {
  it("works with an empty list", () => {
    expect(renderLlmsFullTxt([], SITE)).toMatch(/^# DSA Visualizer/);
  });

  it("includes metadata, the full description and the solution in a js fence", () => {
    const out = renderLlmsFullTxt([entry()], SITE);
    expect(out).toContain("## Two Sum");
    expect(out).toContain("URL: https://example.com/q/two-sum");
    expect(out).toContain("Difficulty: Easy");
    expect(out).toContain("Tags: array");
    expect(out).toContain("Find **two** numbers.\n\nSecond paragraph.");
    expect(out).toContain("```js\nfunction twoSum() {}\n```");
  });

  it("uses a longer fence when the solution contains backtick runs", () => {
    const out = renderLlmsFullTxt([entry({ solutionCode: "const s = ```x```;" })], SITE);
    expect(out).toContain("````js\nconst s = ```x```;\n````");
  });

  it("keeps a multi-line title on one heading line", () => {
    expect(renderLlmsFullTxt([entry({ title: "A\n# B" })], SITE)).toContain("## A # B");
  });
});

describe("TEXT_CACHE_CONTROL", () => {
  it("allows shared caches to serve stale content", () => {
    expect(TEXT_CACHE_CONTROL).toContain("s-maxage=3600");
    expect(TEXT_CACHE_CONTROL).toContain("stale-while-revalidate");
  });
});
