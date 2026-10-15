import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Trace, TraceStep } from "@/lib/tracer/types";
import { EMPTY_STEP_POINTERS, type Pointer, type StepPointers } from "@/lib/viz/overlay-types";
import { arr, frame, nul, num, ref, step, str, table } from "@/lib/viz/test-helpers";
import { legendPointers, legendRows, PointerLegend } from "../pointer-legend";
import { PointerMarks, PointerTag } from "./pointer-marks";
import { pointerRing, pointerStyle } from "./pointer-styles";
import { elementWith, renderWithViz } from "./render-test-utils";
import { StringRenderer } from "./string-renderer";
import { ValueCell } from "./value-cell";
import { useViz } from "./viz-context";
import { ViewToggle } from "./view-toggle";

const trace = (steps: TraceStep[]): Trace => ({ caseIndex: 0, steps, isTruncated: false });
const EMPTY_TRACE = trace([step(0, [frame(1, [])], table())]);

function pointer(name: string, slot: number, overrides: Partial<Pointer> = {}): Pointer {
  return {
    name,
    slot,
    kind: "index",
    frameId: 1,
    isActive: true,
    target: { host: "o1", cellKey: "0" },
    value: num(0),
    isOutOfRange: false,
    ...overrides,
  };
}

const count = (html: string, needle: string): number => html.split(needle).length - 1;

describe("pointer styles", () => {
  it("maps slots onto the 8 palette variables, wrapping around", () => {
    expect(pointerStyle(0)).toEqual({ "--ptr": "var(--ptr-1)" });
    expect(pointerStyle(8)).toEqual({ "--ptr": "var(--ptr-1)" });
    expect(pointerStyle(10)).toEqual({ "--ptr": "var(--ptr-3)" });
  });

  it("draws no ring without pointers and at most three rings with many", () => {
    expect(pointerRing([])).toEqual({});
    const shadow = String(pointerRing([pointer("a", 0), pointer("b", 1), pointer("c", 2), pointer("d", 3)]).boxShadow);
    expect(shadow).toContain("var(--ptr-3)");
    expect(shadow).not.toContain("var(--ptr-4)");
  });
});

describe("PointerMarks", () => {
  it("renders one mark per pointer with the data hooks", () => {
    const html = renderWithViz(EMPTY_TRACE, 0, createElement(PointerMarks, { pointers: [pointer("i", 0), pointer("left", 2, { isActive: false })] }));
    expect(count(html, 'data-testid="pointer-mark"')).toBe(2);
    expect(html).toContain('data-pointer="i"');
    expect(html).toContain('data-slot="2"');
    expect(html).toContain('data-active="true"');
    expect(html).toContain('data-active="false"');
    expect(html).toContain("ptr-chip-dim");
    expect(html).not.toContain("pointer-overflow");
  });

  it("folds pointers beyond the limit into a +n chip that lists them all", () => {
    const names = ["a", "b", "c", "d", "e"];
    const html = renderWithViz(EMPTY_TRACE, 0, createElement(PointerMarks, { pointers: names.map((name, slot) => pointer(name, slot)) }));
    expect(count(html, 'data-testid="pointer-mark"')).toBe(3);
    expect(html).toContain('data-testid="pointer-overflow"');
    expect(html).toContain("+2");
    expect(html).toMatch(/title="a = 0\nb = 0\nc = 0\nd = 0\ne = 0"/);
  });

  it("makes the +n chip a focusable button that names every pointer", () => {
    const pointers = ["a", "b", "c", "d"].map((name, slot) => pointer(name, slot));
    const html = renderWithViz(EMPTY_TRACE, 0, createElement(PointerMarks, { pointers }));
    expect(html).toMatch(/<button[^>]*data-testid="pointer-overflow"/);
    expect(html).toContain('aria-label="1 more pointers. All 4: a = 0, b = 0, c = 0, d = 0"');
  });

  it("shows caller-frame pointers as dashed chips instead of faded ones", () => {
    const html = renderWithViz(EMPTY_TRACE, 0, createElement(PointerMarks, { pointers: [pointer("left", 2, { isActive: false })] }));
    expect(html).toContain("ptr-chip-dim");
    expect(html).not.toMatch(/\bptr-chip(?!-)/);
  });

  it("renders nothing for no pointers and a value chip for PointerTag", () => {
    expect(renderWithViz(EMPTY_TRACE, 0, createElement(PointerMarks, { pointers: [] }))).toBe("");
    const html = renderWithViz(EMPTY_TRACE, 0, createElement(PointerTag, { pointer: pointer("i", 0, { value: num(7) }), hasValue: true }));
    expect(html).toContain("i=7");
  });
});

describe("ValueCell", () => {
  it("adds a ring and marks only when it has pointers", () => {
    const withPointer = renderWithViz(EMPTY_TRACE, 0, elementWith(ValueCell, { status: null, tone: "neutral", pointers: [pointer("i", 0)] }, "x"));
    expect(withPointer).toContain("box-shadow");
    expect(withPointer).toContain('data-pointer="i"');
    for (const pointers of [undefined, []]) {
      const plain = renderWithViz(EMPTY_TRACE, 0, elementWith(ValueCell, { status: null, tone: "neutral", pointers }, "x"));
      expect(plain).not.toContain("box-shadow");
      expect(plain).not.toContain("pointer-mark");
    }
  });
});

describe("StringRenderer", () => {
  const stringTrace = trace([step(0, [frame(7, [["s", str("abcdef")], ["i", num(2)], ["j", num(9)]])], table())]);

  it("draws a cell per character and the pointer on index 2", () => {
    const html = renderWithViz(stringTrace, 0, createElement(StringRenderer, { frameId: 7, name: "s", value: "abcdef" }), { code: "s[i] + s[j]" });
    for (let index = 0; index < 6; index++) expect(html).toContain(`data-testid="string-char-${index}"`);
    const cellTwo = html.slice(html.indexOf('data-testid="string-char-2"'), html.indexOf('data-testid="string-char-3"'));
    expect(cellTwo).toContain('data-pointer="i"');
    expect(html).toContain('data-testid="renderer-string"');
  });

  it("lists an out-of-range pointer after the last cell", () => {
    const html = renderWithViz(stringTrace, 0, createElement(StringRenderer, { frameId: 7, name: "s", value: "abcdef" }), { code: "s[i] + s[j]" });
    expect(html.indexOf("j=9")).toBeGreaterThan(html.indexOf('data-testid="string-char-5"'));
    expect(html).not.toContain('data-testid="string-char-9"');
  });

  it("shows the first 60 characters and +n more", () => {
    const value = "x".repeat(70);
    const html = renderWithViz(EMPTY_TRACE, 0, createElement(StringRenderer, { frameId: 1, name: "s", value }));
    expect(html).toContain('data-testid="string-char-59"');
    expect(html).not.toContain('data-testid="string-char-60"');
    expect(html).toContain("+10 more");
  });

  it("shows invisible characters as symbols", () => {
    const html = renderWithViz(EMPTY_TRACE, 0, createElement(StringRenderer, { frameId: 1, name: "s", value: "a b" }));
    expect(html).toContain("␣");
  });
});

describe("PointerLegend", () => {
  it("renders nothing when there are no pointers", () => {
    expect(renderToStaticMarkup(createElement(PointerLegend, { pointers: EMPTY_STEP_POINTERS, objects: {} }))).toBe("");
  });

  it("lists each pointer variable once, with its value, and includes null ref names", () => {
    const twice = [pointer("i", 0), pointer("i", 0, { target: { host: "o2", cellKey: "1" } }), pointer("left", 1, { isActive: false })];
    const nulls = [pointer("prev", 2, { kind: "ref", value: nul })];
    const pointers: StepPointers = { ...EMPTY_STEP_POINTERS, all: twice, nulls };
    expect(legendPointers(pointers).map((item) => item.name)).toEqual(["i", "left", "prev"]);
    const html = renderToStaticMarkup(createElement(PointerLegend, { pointers, objects: {} }));
    expect(html).toContain('data-testid="pointer-legend"');
    expect(count(html, 'data-testid="pointer-legend-item"')).toBe(3);
    expect(html).toContain('data-pointer="prev"');
    expect(html).toContain("null");
  });
});

describe("legendRows", () => {
  it("groups a recursive variable into one row with the innermost value and a frame count", () => {
    const frames = [1, 2, 3].map((frameId) => pointer("node", 0, { frameId, kind: "ref", isActive: frameId === 3, value: num(frameId * 10) }));
    const rows = legendRows({ ...EMPTY_STEP_POINTERS, all: [...frames, pointer("i", 1, { frameId: 3 })] });
    expect(rows.map((row) => [row.pointer.name, row.depth])).toEqual([["node", 3], ["i", 1]]);
    expect(rows[0].pointer.frameId).toBe(3);
    const html = renderToStaticMarkup(createElement(PointerLegend, { pointers: { ...EMPTY_STEP_POINTERS, all: frames }, objects: {} }));
    expect(count(html, 'data-testid="pointer-legend-item"')).toBe(1);
    expect(html).toContain("30");
    expect(html).toContain("×3");
  });
});

describe("ViewToggle", () => {
  it("marks the current mode as pressed", () => {
    const html = renderWithViz(EMPTY_TRACE, 0, createElement(ViewToggle, { path: "a/nums", mode: "bars" }));
    expect(html).toMatch(/data-testid="view-toggle-array"[^>]*aria-pressed="false"/);
    expect(html).toMatch(/data-testid="view-toggle-bars"[^>]*aria-pressed="true"/);
  });
});

describe("useViz additions", () => {
  function Probe() {
    const viz = useViz();
    return createElement("span", null, `${viz.nameOf(1)}|${viz.nameOf(9)}|${viz.viewModeOf("p")}|${viz.pointers.all.length}|${viz.paths.sequences.length}`);
  }

  it("resolves object names and starts without a view override", () => {
    const named = trace([step(0, [frame(1, [["nums", ref(1)], ["i", num(0)]])], table(arr(1, [num(4)])))]);
    expect(renderWithViz(named, 0, createElement(Probe), { code: "nums[i]" })).toContain("nums|null|null|1|0");
  });
});
