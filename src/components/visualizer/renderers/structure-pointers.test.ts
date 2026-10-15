import { createElement } from "react";
import { describe, expect, it } from "vitest";
import type { SObject, SValue, Trace, TraceFrame, TraceStep } from "@/lib/tracer/types";
import { arr, frame, map, nul, num, obj, ref, step, str, table } from "@/lib/viz/test-helpers";
import { GridRenderer } from "./grid-renderer";
import { LinkedListRenderer } from "./linked-list-renderer";
import { MapRenderer } from "./map-renderer";
import { StringRenderer } from "./string-renderer";
import { renderWithViz } from "./render-test-utils";

const props = (object: SObject) => ({ object, path: "p/root", depth: 0, ancestors: [] as number[] });
const trace = (steps: TraceStep[]): Trace => ({ caseIndex: 0, steps, isTruncated: false });
const count = (html: string, needle: string): number => html.split(needle).length - 1;

/** The markup from the given test id up to the next cell/node (or the end). */
function part(html: string, marker: string, until: string): string {
  const start = html.indexOf(marker);
  const end = html.indexOf(until, start + 1);
  return html.slice(start, end === -1 ? undefined : end);
}

describe("LinkedListRenderer pointers", () => {
  const list = [
    obj(1, [["val", num(1)], ["next", ref(2)]]),
    obj(2, [["val", num(2)], ["next", ref(3)]]),
    obj(3, [["val", num(3)], ["next", nul]]),
  ];
  const locals = (rest: [string, SValue][]): TraceFrame[] => [frame(1, [["head", ref(1)], ...rest])];
  const showStep = (rest: [string, SValue][], code = ""): string =>
    renderWithViz(trace([step(0, locals([["nxt", ref(3)]]), table(...list)), step(1, locals(rest), table(...list))]), 1, createElement(LinkedListRenderer, props(list[0])), { code });

  it("puts prev and curr on their nodes and the null pointer on the terminator", () => {
    const html = showStep([["prev", ref(1)], ["curr", ref(2)], ["nxt", nul]]);
    const cells = html.split('class="flex items-start gap-1.5"').slice(1);
    expect(cells).toHaveLength(3);
    expect(cells[0]).toContain('data-pointer="prev"');
    expect(cells[0]).toContain('data-pointer="head"');
    expect(cells[1]).toContain('data-pointer="curr"');
    expect(cells[1]).not.toContain('data-pointer="prev"');
    expect(cells[2]).not.toContain('data-pointer="curr"');
    expect(html.indexOf('data-pointer="nxt"')).toBeGreaterThan(html.indexOf(">null<"));
    expect(html.indexOf('data-pointer="nxt"')).toBeGreaterThan(html.lastIndexOf('data-pointer="curr"'));
    expect(count(html, 'data-pointer="nxt"')).toBe(1);
  });

  it("captions the first node with its variable name and adds no marks when nothing points at the list", () => {
    const html = renderWithViz(trace([step(0, [frame(1, [])], table(...list))]), 0, createElement(LinkedListRenderer, props(list[0])));
    expect(html).toContain(">root<");
    expect(html).not.toContain("pointer-mark");
    expect(html).not.toContain("padding-top");
  });

  it("indexes array-backed lists by position", () => {
    const backing = arr(1, [num(7), num(8)]);
    const html = renderWithViz(trace([step(0, [frame(1, [["list", ref(1)], ["i", num(1)]])], table(backing))]), 0, createElement(LinkedListRenderer, props(backing)), {
      code: "list[i]",
    });
    const cells = html.split('class="flex items-start gap-1.5"').slice(1);
    expect(cells[1]).toContain('data-pointer="i"');
    expect(cells[0]).not.toContain('data-pointer="i"');
  });
});

describe("GridRenderer pointers and paths", () => {
  const grid = arr(1, [ref(2), ref(3), ref(4)]);
  const rows = [arr(2, [num(1), num(2), num(3)]), arr(3, [num(4), num(5), num(6)]), arr(4, [num(7), num(8), num(9)])];
  const code = "grid[r][c]";
  const showGrid = (frames: TraceFrame[]): string =>
    renderWithViz(trace([step(0, frames, table(grid, ...rows))]), 0, createElement(GridRenderer, props(grid)), { code });

  it("shows r and c on cell (r, c) and tints the row and column headers", () => {
    const html = showGrid([frame(1, [["grid", ref(1)], ["r", num(1)], ["c", num(2)]])]);
    const cell = part(html, 'data-cell="1,2"', 'data-cell="2,0"');
    expect(cell).toContain('data-pointer="r"');
    expect(cell).toContain('data-pointer="c"');
    expect(cell).toContain("box-shadow");
    expect(part(html, 'data-cell="1,1"', 'data-cell="1,2"')).not.toContain("pointer-mark");
    expect(count(html, 'data-pointer-header="r"')).toBe(1);
    expect(count(html, 'data-pointer-header="c"')).toBe(1);
  });

  it("draws a faint band behind the cells of the pointed row only", () => {
    const html = showGrid([frame(1, [["grid", ref(1)], ["r", num(1)]])]);
    expect(count(html, 'data-testid="row-band"')).toBe(3);
    expect(part(html, 'data-cell="0,0"', 'data-cell="1,0"')).not.toContain("row-band");
    expect(count(html, "pointer-mark")).toBe(0);
  });

  it("marks the cells of a three-step path with their visit order", () => {
    const dfs = (id: number, r: number, c: number): TraceFrame => frame(id, [["grid", ref(1)], ["r", num(r)], ["c", num(c)]], undefined, "dfs");
    const html = showGrid([dfs(1, 0, 0), dfs(2, 0, 1), dfs(3, 1, 1)]);
    for (const key of ["0,0", "0,1", "1,1"]) expect(html).toContain(`data-cell="${key}" data-path-slots=`);
    expect(html).not.toContain('data-cell="1,0" data-path-slots=');
    expect(part(html, 'data-cell="0,1"', 'data-cell="0,2"')).toMatch(/data-testid="path-order"[^>]*>2</);
    expect(part(html, 'data-cell="1,1"', 'data-cell="1,2"')).toMatch(/data-testid="path-order"[^>]*>3</);
    expect(count(html, 'data-testid="path-order"')).toBe(3);
  });

  it("tints cells of a visited matrix", () => {
    const visited = [arr(5, [{ k: "boolean", v: true }, { k: "boolean", v: false }]), arr(6, [{ k: "boolean", v: false }, { k: "boolean", v: false }])];
    const seen = arr(7, [ref(5), ref(6)]);
    const html = renderWithViz(trace([step(0, [frame(1, [["grid", ref(1)], ["visited", ref(7)]])], table(grid, ...rows, ...visited, seen))]), 0, createElement(GridRenderer, props(grid)), {
      code,
    });
    expect(count(html, 'data-reached="true"')).toBe(1);
    expect(html).toContain('data-cell="0,0" data-reached="true"');
  });
});

describe("MapRenderer pointers", () => {
  it("rings the row a variable indexes and shows its name", () => {
    const seen = map(1, [[str("a"), num(0)], [str("b"), num(1)]]);
    const html = renderWithViz(trace([step(0, [frame(1, [["seen", ref(1)], ["ch", str("b")]])], table(seen))]), 0, createElement(MapRenderer, props(seen)), {
      code: "seen[ch]",
    });
    expect(count(html, 'data-pointer="ch"')).toBe(1);
    const rowsHtml = html.split('class="relative flex flex-wrap items-start gap-x-2').slice(1);
    expect(rowsHtml[0]).not.toContain("pointer-mark");
    expect(rowsHtml[1]).toContain('data-pointer="ch"');
    expect(html).toContain("box-shadow");
  });
});

describe("StringRenderer surrogate pairs", () => {
  const value = "a😀b";
  const html = renderWithViz(trace([step(0, [frame(1, [["s", str(value)], ["i", num(2)]])], table())]), 0, createElement(StringRenderer, { frameId: 1, name: "s", value }), {
    code: "s[i]",
  });

  it("draws the pair whole in the first cell and a continuation in the second, one cell per code unit", () => {
    expect(count(html, 'data-testid="string-char-')).toBe(4);
    expect(part(html, 'data-testid="string-char-1"', 'data-testid="string-char-2"')).toContain("😀");
    const second = part(html, 'data-testid="string-char-2"', 'data-testid="string-char-3"');
    expect(second).toContain("·");
    expect(second).not.toContain("😀");
    expect(html).not.toMatch(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/);
  });

  it("keeps pointer indices in UTF-16 units", () => {
    expect(part(html, 'data-testid="string-char-2"', 'data-testid="string-char-3"')).toContain('data-pointer="i"');
    expect(part(html, 'data-testid="string-char-3"', "</div></div></div>")).not.toContain('data-pointer="i"');
  });
});
