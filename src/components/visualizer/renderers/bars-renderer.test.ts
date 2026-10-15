import { createElement } from "react";
import { describe, expect, it } from "vitest";
import type { SObject, SValue, Trace } from "@/lib/tracer/types";
import { arr, frame, num, ref, step, str, table } from "@/lib/viz/test-helpers";
import { ArrayRenderer } from "./array-renderer";
import { BarsRenderer } from "./bars-renderer";
import { gutterStyle, markStackPx } from "./pointer-gutter";
import { renderWithViz } from "./render-test-utils";

const CODE = "while (left < right) { height[left]; height[right]; height[i]; }";
const HEIGHTS = arr(1, [num(1), num(8), num(6), num(2)]);

function traceOf(object: SObject, locals: [string, SValue][]): Trace {
  return { caseIndex: 0, steps: [step(0, [frame(1, [["height", ref(object.id)], ...locals])], table(object))], isTruncated: false };
}

const props = (object: SObject) => ({ object, path: "p/height", depth: 0, ancestors: [] as number[] });
const bars = (object: SObject, locals: [string, SValue][] = [], code = CODE) =>
  renderWithViz(traceOf(object, locals), 0, createElement(BarsRenderer, props(object)), { code });
const cells = (object: SObject, locals: [string, SValue][] = [], code = CODE) =>
  renderWithViz(traceOf(object, locals), 0, createElement(ArrayRenderer, props(object)), { code });
const count = (html: string, needle: string): number => html.split(needle).length - 1;
const between = (html: string, from: string, to: string): string => html.slice(html.indexOf(from), html.indexOf(to));

describe("BarsRenderer", () => {
  it("draws one bar per item with its value and the Bars toggle pressed", () => {
    const html = bars(HEIGHTS);
    expect(html).toContain('data-testid="renderer-bars"');
    expect(html).toContain('role="img"');
    expect(count(html, 'data-testid="bar-')).toBe(4);
    expect(html).toMatch(/data-testid="bar-1" data-value="8"/);
    expect(html).toMatch(/data-testid="view-toggle-bars"[^>]*aria-pressed="true"/);
    expect(html).toContain("Bar chart of 4 values: 1, 8, 6, 2");
  });

  it("caps the bars at the limit and says how many are not drawn", () => {
    const html = bars(arr(1, Array.from({ length: 70 }, (_, index) => num(index)), 75));
    expect(html).toContain('data-testid="bar-59"');
    expect(html).not.toContain('data-testid="bar-60"');
    expect(html).toContain("+15 more");
  });

  it("puts the pointer mark on the right bar", () => {
    const html = bars(HEIGHTS, [["i", num(2)]]);
    const barTwo = between(html, 'data-testid="bar-2"', 'data-testid="bar-3"');
    expect(barTwo).toContain('data-pointer="i"');
    expect(between(html, 'data-testid="bar-0"', 'data-testid="bar-2"')).not.toContain("pointer-mark");
    expect(barTwo).toContain("box-shadow");
  });

  it("tints the bars between left and right, and lists out-of-range pointers", () => {
    const html = bars(HEIGHTS, [["left", num(1)], ["right", num(2)], ["i", num(9)]]);
    expect(count(html, 'data-testid="range-band"')).toBe(2);
    const columns = html.split('max-w-12 flex-1 flex-col"').slice(1);
    expect(columns.map((column) => column.includes("range-band"))).toEqual([false, true, true, false]);
    expect(html).toContain("i=9");
  });

  it("handles negative values and a single bar", () => {
    const html = bars(arr(1, [num(-3), num(4)]));
    expect(html).toContain('data-value="-3"');
    expect(count(html, 'data-testid="bar-')).toBe(2);
    expect(count(bars(arr(1, [num(0)])), 'data-testid="bar-')).toBe(1);
  });
});

describe("ArrayRenderer pointers", () => {
  it("rings the pointed cell and shows its name", () => {
    const html = cells(HEIGHTS, [["i", num(1)]]);
    expect(html).toContain('data-pointer="i"');
    expect(html).toContain("padding-top:22px");
    expect(html).toContain('data-testid="view-toggle-bars"');
  });

  it("adds no gutter and no marks without pointers", () => {
    const html = cells(HEIGHTS, [], "");
    expect(html).not.toContain("pointer-mark");
    expect(html).not.toContain("padding-top");
  });

  it("shows a band for a window and an out-of-range chip after the last cell", () => {
    const html = cells(HEIGHTS, [["left", num(0)], ["right", num(1)], ["i", num(5)]]);
    expect(count(html, 'data-testid="range-band"')).toBe(2);
    expect(html.indexOf("i=5")).toBeGreaterThan(html.indexOf('aria-label="Array of 4 items"'));
    expect(html.indexOf("i=5")).toBeGreaterThan(html.lastIndexOf(">3<"));
  });

  it("offers the bars toggle only for numeric arrays with two or more items", () => {
    expect(cells(arr(1, [num(1), str("a")]))).not.toContain("view-toggle");
    expect(cells(arr(1, [num(1)]))).not.toContain("view-toggle");
    expect(cells(HEIGHTS)).toMatch(/data-testid="view-toggle-array"[^>]*aria-pressed="true"/);
  });
});

describe("pointers into the unrecorded tail", () => {
  const long = arr(1, Array.from({ length: 70 }, (_, index) => num(index)), 80);
  const locals: [string, SValue][] = [["r", num(79)]];

  it("lists a pointer past the last drawn bar after the bars", () => {
    const html = bars(long, locals, "height[r]");
    expect(html).toContain("r=79");
    expect(count(html, 'data-pointer="r"')).toBe(1);
    expect(html).not.toContain('data-testid="bar-79"');
  });

  it("lists a pointer past the last recorded cell of a truncated array", () => {
    const truncated = arr(1, [num(1), num(2), num(3)], 80);
    const html = cells(truncated, locals, "height[r]");
    expect(html).toContain("r=79");
    expect(html.indexOf("r=79")).toBeGreaterThan(html.indexOf("+77 more"));
  });
});

describe("pointer gutter sizing", () => {
  it("grows with the chip stack: 3 chips and +n need 70px", () => {
    expect(markStackPx(0)).toBe(0);
    expect(markStackPx(1)).toBe(22);
    expect(markStackPx(3)).toBe(54);
    expect(markStackPx(5)).toBe(70);
    expect(gutterStyle(0, "top")).toBeUndefined();
    expect(gutterStyle(5, "bottom")).toEqual({ paddingBottom: 70 });
  });

  it("reserves the full stack above an array cell with five pointers", () => {
    const names = ["a", "b", "c", "d", "e"];
    const code = names.map((name) => `height[${name}]`).join(";");
    const html = cells(HEIGHTS, names.map((name): [string, SValue] => [name, num(1)]), code);
    expect(html).toContain("padding-top:70px");
  });
});
