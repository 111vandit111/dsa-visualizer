import { describe, expect, it } from "vitest";
import { plainTextSummary } from "./text";

describe("plainTextSummary", () => {
  it("returns an empty string for empty input", () => {
    expect(plainTextSummary("")).toBe("");
    expect(plainTextSummary("   \n  ")).toBe("");
  });

  it("strips headings, emphasis, inline code, links and lists", () => {
    const md = "# Title\n\nUse **bold**, *italic* and `code`. See [docs](https://x.dev/a_b).\n\n- one\n- two";
    expect(plainTextSummary(md)).toBe("Title Use bold, italic and code. See docs. one two");
  });

  it("drops fenced code blocks, including unterminated ones", () => {
    expect(plainTextSummary("Before\n```js\nconst a = 1;\n```\nAfter")).toBe("Before After");
    expect(plainTextSummary("Before\n```js\nconst a = 1;")).toBe("Before");
  });

  it("keeps snake_case words and spaced math intact", () => {
    expect(plainTextSummary("use snake_case_name and 2 * 3 * 4")).toBe("use snake_case_name and 2 * 3 * 4");
  });

  it("removes html tags", () => {
    expect(plainTextSummary("a <b>bold</b> <script>x</script> word")).toBe("a bold x word");
  });

  it("collapses whitespace and newlines", () => {
    expect(plainTextSummary("a\n\n\tb    c")).toBe("a b c");
  });

  it("cuts long text at a word boundary with an ellipsis within the limit", () => {
    const text = "word ".repeat(100);
    const out = plainTextSummary(text, 50);
    expect(out.length).toBeLessThanOrEqual(50);
    expect(out.endsWith("…")).toBe(true);
    expect(out.slice(0, -1).endsWith("word")).toBe(true);
  });

  it("uses 160 by default and leaves short text alone", () => {
    expect(plainTextSummary("x".repeat(400)).length).toBeLessThanOrEqual(160);
    expect(plainTextSummary("short text")).toBe("short text");
  });

  it("handles a single very long token", () => {
    const out = plainTextSummary("a".repeat(500), 40);
    expect(out.length).toBeLessThanOrEqual(40);
    expect(out.endsWith("…")).toBe(true);
  });
});
