import { describe, expect, it } from "vitest";
import { parseQuestionInput } from "./question.server";

const validInput = {
  slug: "design-twitter",
  title: "Design Twitter",
  difficulty: "Medium",
  tags: ["design", "heap"],
  description: "# Hello",
  solutionCode: "class Solution { postTweet(a, b) { return a + b; } }",
  testCases: [
    {
      ops: ["Twitter", "postTweet", "getNewsFeed"],
      args: [[], [1, 5], [1]],
      expected: [null, null, [5]],
    },
  ],
  visualHints: { "this.tweetMap": "map", minHeap: "heap" },
};

function issuePaths(body: unknown): string[] {
  const result = parseQuestionInput(body);
  return result.ok ? [] : result.issues.map((issue) => issue.path);
}

describe("parseQuestionInput", () => {
  it("accepts a valid design question", () => {
    const result = parseQuestionInput(validInput);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.testCases).toHaveLength(1);
  });

  it("keeps kind absent when the input omits it, and validates it when present", () => {
    const omitted = parseQuestionInput(validInput);
    expect(omitted.ok && omitted.value.kind).toBeUndefined();
    const given = parseQuestionInput({ ...validInput, kind: "algorithm" });
    expect(given.ok && given.value.kind).toBe("algorithm");
    expect(issuePaths({ ...validInput, kind: "other" })).toContain("kind");
  });

  it("accepts a method test case", () => {
    const result = parseQuestionInput({
      ...validInput,
      testCases: [{ method: "twoSum", args: [[2, 7], 9], expected: [0, 1] }],
    });
    expect(result.ok).toBe(true);
  });

  it("applies defaults for tags, description and hints", () => {
    const { tags, description, visualHints, ...rest } = validInput;
    void tags;
    void description;
    void visualHints;
    const result = parseQuestionInput(rest);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.tags).toEqual([]);
      expect(result.value.visualHints).toEqual({});
    }
  });

  it("rejects mismatched ops/args/expected lengths with a field path", () => {
    const body = { ...validInput, testCases: [{ ops: ["A", "b"], args: [[]], expected: [null, null] }] };
    expect(issuePaths(body)).toContain("testCases.0");
  });

  it("rejects a bad slug", () => {
    expect(issuePaths({ ...validInput, slug: "Bad Slug" })).toContain("slug");
  });

  it("rejects a bad hint value and a bad hint key", () => {
    expect(issuePaths({ ...validInput, visualHints: { minHeap: "pile" } }).length).toBeGreaterThan(0);
    expect(issuePaths({ ...validInput, visualHints: { "1bad": "heap" } }).length).toBeGreaterThan(0);
  });

  it("rejects solution code that does not parse", () => {
    const result = parseQuestionInput({ ...validInput, solutionCode: "class {" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0].path).toBe("solutionCode");
  });

  it("rejects non-object bodies and empty test case lists", () => {
    expect(parseQuestionInput(null).ok).toBe(false);
    expect(issuePaths({ ...validInput, testCases: [] })).toContain("testCases");
  });

  it("rejects too many tags and uppercase tags", () => {
    expect(issuePaths({ ...validInput, tags: ["Heap"] })).toContain("tags.0");
    expect(issuePaths({ ...validInput, tags: Array.from({ length: 11 }, (_, i) => `t${i}`) })).toContain("tags");
  });

  it("rejects dynamic import() anywhere in the solution", () => {
    for (const code of ["import('x')", "function f() { import('x'); }"]) {
      const result = parseQuestionInput({ ...validInput, solutionCode: code });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.issues[0].path).toBe("solutionCode");
    }
  });

  it("rejects import.meta and strict-mode violations", () => {
    expect(parseQuestionInput({ ...validInput, solutionCode: "const u = import.meta.url;" }).ok).toBe(false);
    expect(parseQuestionInput({ ...validInput, solutionCode: "with (a) { b; }" }).ok).toBe(false);
  });
});
