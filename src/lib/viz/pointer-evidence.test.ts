import { describe, expect, it } from "vitest";
import { extractIndexEvidence, FALLBACK_INDEX_NAMES } from "./pointer-evidence";

const usesOf = (code: string, name: string) => extractIndexEvidence(code).get(name);

describe("extractIndexEvidence", () => {
  it("records every variable inside an index expression with its base", () => {
    expect(usesOf("const x = nums[i];", "i")).toEqual([{ base: "nums", via: [] }]);
    const evidence = extractIndexEvidence("return nums[left + (right - left) / 2];");
    expect([...evidence.keys()].sort()).toEqual(["left", "right"]);
    expect(evidence.get("right")).toEqual([{ base: "nums", via: [] }]);
  });

  it("handles member bases such as this.nums and a.b.c", () => {
    expect(usesOf("this.nums[i] = 0;", "i")).toEqual([{ base: "this.nums", via: [] }]);
    expect(usesOf("a.b.c[k]++;", "k")).toEqual([{ base: "a.b.c", via: [] }]);
    expect(usesOf("nums?.[i];", "i")).toEqual([{ base: "nums", via: [] }]);
  });

  it("follows bracket chains: dp[i-1][j] -> j on dp via [i]", () => {
    const evidence = extractIndexEvidence("dp[i - 1][j] = dp[i][j - 1] + 1;");
    expect(evidence.get("i")).toEqual([{ base: "dp", via: [] }]);
    expect(evidence.get("j")).toEqual([{ base: "dp", via: ["i"] }]);
  });

  it("uses a number literal for via when the row is constant", () => {
    expect(usesOf("grid[0][c] = 1;", "c")).toEqual([{ base: "grid", via: ["0"] }]);
    expect(usesOf("grid[2 * r][c] = 1;", "c")).toEqual([{ base: "grid", via: ["r"] }]);
    expect(usesOf("grid[f()][c] = 1;", "c")).toEqual([{ base: "grid", via: [""] }]);
  });

  it("deduplicates repeated uses", () => {
    expect(usesOf("a[i] = a[i] + 1; a[i]++;", "i")).toEqual([{ base: "a", via: [] }]);
  });

  it("records the argument of string and map accessors", () => {
    expect(usesOf("s.charAt(i) === t.charCodeAt(i)", "i")).toEqual([{ base: "s", via: [] }, { base: "t", via: [] }]);
    expect(usesOf("const c = this.s.at(pos);", "pos")).toEqual([{ base: "this.s", via: [] }]);
    expect(usesOf("memo.has(key) && memo.get(key)", "key")).toEqual([{ base: "memo", via: [] }]);
    expect(usesOf("cache.set(k, v)", "k")).toEqual([{ base: "cache", via: [] }]);
    expect(usesOf("cache.set(k, v)", "v")).toBeUndefined();
  });

  it("records both bounds of slice/substring/substr", () => {
    const evidence = extractIndexEvidence("s.substring(left, right + 1); s.slice(i); s.substr(a, b, c);");
    expect(evidence.get("left")).toEqual([{ base: "s", via: [] }]);
    expect(evidence.get("right")).toEqual([{ base: "s", via: [] }]);
    expect(evidence.get("i")).toEqual([{ base: "s", via: [] }]);
    expect(evidence.get("b")).toEqual([{ base: "s", via: [] }]);
    expect(evidence.has("c")).toBe(false);
  });

  it("supports a bracket chain as a method receiver", () => {
    expect(usesOf("rows[r].charAt(c)", "c")).toEqual([{ base: "rows", via: ["r"] }]);
    expect(usesOf("adj[u].has(v)", "v")).toEqual([{ base: "adj", via: ["u"] }]);
  });

  it("ignores property names, calls, keywords and literals inside the index", () => {
    const evidence = extractIndexEvidence("nums[Math.floor(n / 2)] + nums[arr.length - 1] + nums[this.size] + nums[typeof x]");
    expect([...evidence.keys()].sort()).toEqual(["n", "x"]);
  });

  it("attributes a nested index only to its own base", () => {
    const evidence = extractIndexEvidence("nums[order[k]]");
    expect(evidence.get("k")).toEqual([{ base: "order", via: [] }]);
    expect(evidence.has("order")).toBe(false);
  });

  it("does not treat array literals, destructuring or call results as bases", () => {
    const code = "const [a, b] = pair; const x = [i, j]; return [i, j]; foo()[i]; (x)[j]; for (const v of [k]) {}";
    expect(extractIndexEvidence(code).size).toBe(0);
  });

  it("still finds indexes in swap destructuring", () => {
    const evidence = extractIndexEvidence("[nums[i], nums[j]] = [nums[j], nums[i]];");
    expect(evidence.get("i")).toEqual([{ base: "nums", via: [] }]);
    expect(evidence.get("j")).toEqual([{ base: "nums", via: [] }]);
  });

  it("skips strings, template text, comments and regexes", () => {
    const code = [
      'const a = "nums[i]";',
      "const b = 'x.charAt(j)';",
      "// nums[k]",
      "/* grid[r][c] */",
      "const re = /a[l]b/g;",
      "const t = `text ${nums[p]} and nums[q]`;",
      "const d = total / n / 2;",
    ].join("\n");
    const evidence = extractIndexEvidence(code);
    expect([...evidence.keys()]).toEqual(["p"]);
    expect(evidence.get("p")).toEqual([{ base: "nums", via: [] }]);
  });

  it("treats a slash after an identifier as division and recovers after a regex", () => {
    const evidence = extractIndexEvidence("const x = a[i] / b[j] / 2; const m = s.match(/[0-9]+/); c[k] = 1;");
    expect([...evidence.keys()].sort()).toEqual(["i", "j", "k"]);
  });

  it("copes with nested templates and unbalanced input", () => {
    expect(usesOf("const t = `a ${`b ${nums[i]}`} c`;", "i")).toEqual([{ base: "nums", via: [] }]);
    expect(() => extractIndexEvidence("nums[i + ((")).not.toThrow();
    expect(() => extractIndexEvidence('const s = "unterminated')).not.toThrow();
    expect(extractIndexEvidence("").size).toBe(0);
  });

  it("scans a realistic solution", () => {
    const code = `
      class Solution {
        lcs(a, b) {
          const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
          for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
              dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
          }
          return dp[a.length][b.length];
        }
      }`;
    const evidence = extractIndexEvidence(code);
    expect(evidence.get("i")).toEqual([{ base: "dp", via: [] }, { base: "a", via: [] }]);
    expect(evidence.get("j")).toEqual([{ base: "dp", via: ["i"] }, { base: "b", via: [] }]);
  });
});

describe("FALLBACK_INDEX_NAMES", () => {
  it("lists only the names that are positions by convention", () => {
    for (const name of ["i", "j", "lo", "hi", "left", "right", "mid", "idx", "index"]) {
      expect(FALLBACK_INDEX_NAMES.has(name)).toBe(true);
    }
  });

  it("leaves out count-like and accumulator-like names, which need source evidence", () => {
    for (const name of ["k", "l", "r", "p", "q", "top", "start", "end", "count"]) {
      expect(FALLBACK_INDEX_NAMES.has(name)).toBe(false);
    }
  });
});
