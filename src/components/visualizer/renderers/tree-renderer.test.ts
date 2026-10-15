import { createElement } from "react";
import { describe, expect, it } from "vitest";
import type { SObject, SValue, Trace, TraceFrame } from "@/lib/tracer/types";
import { arr, frame, heap, nul, num, obj, ref, step, str, table } from "@/lib/viz/test-helpers";
import { HeapRenderer } from "./heap-renderer";
import { renderWithViz } from "./render-test-utils";
import { TreeRenderer } from "./tree-renderer";

const props = (object: SObject) => ({ object, path: "p/root", depth: 0, ancestors: [] as number[] });
const traceOf = (objects: SObject[], frames: TraceFrame[]): Trace => ({ caseIndex: 0, steps: [step(0, frames, table(...objects))], isTruncated: false });
const renderTree = (objects: SObject[], frames: TraceFrame[], code = ""): string =>
  renderWithViz(traceOf(objects, frames), 0, createElement(TreeRenderer, props(objects[0])), { code });
const count = (html: string, needle: string): number => html.split(needle).length - 1;
/** Markup of one node's `<div>` (up to the next node). */
const nodeHtml = (html: string, key: string): string => {
  const start = html.indexOf(`data-testid="tree-node-${key}"`);
  const next = html.indexOf('data-testid="tree-node-', start + 1);
  return html.slice(start, next === -1 ? undefined : next);
};

const BINARY = [
  obj(1, [["val", num(1)], ["left", ref(2)], ["right", ref(3)]]),
  obj(2, [["val", num(2)], ["left", nul], ["right", nul]]),
  obj(3, [["val", num(3)], ["left", nul], ["right", nul]]),
];
const dfs = (id: number, nodeId: number): TraceFrame => frame(id, [["node", ref(nodeId)]], undefined, "dfs");

describe("TreeRenderer binary trees", () => {
  it("draws a node per object with its edges", () => {
    const html = renderTree(BINARY, [frame(1, [["root", ref(1)]])]);
    expect(html).toContain('data-testid="renderer-tree"');
    for (const id of [1, 2, 3]) expect(html).toContain(`data-testid="tree-node-o${id}"`);
    expect(count(html, "<line")).toBe(2);
    expect(html).toContain("Binary tree of 3 nodes");
  });

  it("shows the curr pointer on its node only", () => {
    const html = renderTree(BINARY, [frame(1, [["root", ref(1)], ["curr", ref(2)]])]);
    expect(nodeHtml(html, "o2")).toContain('data-pointer="curr"');
    expect(nodeHtml(html, "o2")).toContain("box-shadow");
    expect(nodeHtml(html, "o1")).not.toContain('data-pointer="curr"');
    expect(nodeHtml(html, "o3")).not.toContain("pointer-mark");
  });

  it("lights the nodes and edges of the recursion path", () => {
    const html = renderTree(BINARY, [dfs(1, 1), dfs(2, 2)]);
    expect(nodeHtml(html, "o1")).toContain('data-path-slots="');
    expect(nodeHtml(html, "o2")).toContain('data-path-slots="');
    expect(html.slice(html.indexOf('data-testid="tree-node-o3"'))).not.toMatch(/^[^>]*data-path-slots/);
    expect(count(html, "ptr-stroke")).toBe(1);
  });

  it("tints nodes that a visited set reached", () => {
    const objects = [...BINARY, { k: "set", id: 9, items: [ref(3)], size: 1 } as SObject];
    const html = renderTree(objects, [frame(1, [["root", ref(1)], ["visited", ref(9)]])]);
    expect(nodeHtml(html, "o3")).toContain('data-reached="true"');
    expect(nodeHtml(html, "o2")).not.toContain("data-reached");
  });

  it("maps a pointer index onto a level-order array tree", () => {
    const levels = arr(1, [num(5), num(3), num(8)]);
    const html = renderTree([levels], [frame(1, [["tree", ref(1)], ["i", num(2)]])], "tree[i]");
    expect(nodeHtml(html, "i2")).toContain('data-pointer="i"');
    expect(nodeHtml(html, "i1")).not.toContain("pointer-mark");
  });
});

describe("TreeRenderer red-black colours", () => {
  it("fills red nodes red and black nodes dark", () => {
    const objects = [
      obj(1, [["val", num(10)], ["color", str("B")], ["left", ref(2)], ["right", ref(3)]]),
      obj(2, [["val", num(5)], ["color", str("R")], ["left", nul], ["right", nul]]),
      obj(3, [["val", num(15)], ["left", nul], ["right", nul]]),
    ];
    const html = renderTree(objects, [frame(1, [["root", ref(1)]])]);
    expect(nodeHtml(html, "o2")).toContain("bg-viz-rose/30");
    expect(nodeHtml(html, "o1")).toContain("bg-background");
    expect(nodeHtml(html, "o1")).not.toContain("bg-viz-rose/30");
    expect(nodeHtml(html, "o3")).not.toContain("bg-viz-rose/30");
  });
});

describe("TreeRenderer n-ary trees", () => {
  it("follows a children array", () => {
    const objects = [
      obj(1, [["val", num(1)], ["children", ref(4)]]),
      obj(2, [["val", num(2)], ["children", ref(5)]]),
      obj(3, [["val", num(3)], ["children", ref(5)]]),
      arr(4, [ref(2), ref(3)]),
      arr(5, []),
    ];
    const html = renderTree(objects, [frame(1, [["root", ref(1)], ["node", ref(3)]])]);
    for (const id of [1, 2, 3]) expect(html).toContain(`data-testid="tree-node-o${id}"`);
    expect(count(html, "<line")).toBe(2);
    expect(nodeHtml(html, "o3")).toContain('data-pointer="node"');
    expect(html).toContain("Tree of 3 nodes");
  });

  it("labels trie edges with their characters", () => {
    const objects = [
      obj(1, [["children", ref(2)], ["isEnd", { k: "boolean", v: false }]]),
      obj(2, [["a", ref(3)], ["b", ref(4)]]),
      obj(3, [["children", ref(5)], ["isEnd", { k: "boolean", v: true }]]),
      obj(4, [["children", ref(5)], ["isEnd", { k: "boolean", v: true }]]),
      obj(5, []),
    ];
    const html = renderTree(objects, [frame(1, [["root", ref(1)]])]);
    expect(count(html, 'data-testid="tree-edge-label"')).toBe(2);
    expect(html).toMatch(/data-testid="tree-edge-label"[^>]*>a</);
    expect(html).toMatch(/data-testid="tree-edge-label"[^>]*>b</);
  });
});

describe("HeapRenderer pointers", () => {
  const locals = (index: number): [string, SValue][] => [["heap", ref(1)], ["i", num(index)]];
  const renderHeap = (index: number): string => {
    const object = heap(1, [num(1), num(3), num(2)]);
    return renderWithViz(traceOf([object], [frame(1, locals(index))]), 0, createElement(HeapRenderer, props(object)), { code: "heap[i]" });
  };

  it("shows pointer i on the tree node and on the backing-array cell", () => {
    const html = renderHeap(1);
    expect(count(html, 'data-pointer="i"')).toBe(2);
    expect(nodeHtml(html, "i1")).toContain('data-pointer="i"');
    const arrayRow = html.slice(html.indexOf("Heap backing array"));
    expect(count(arrayRow, 'data-pointer="i"')).toBe(1);
    expect(count(html, 'data-slot="0"')).toBe(2);
  });

  it("lists an out-of-range pointer after the array row", () => {
    const html = renderHeap(7);
    expect(count(html, 'data-pointer="i"')).toBe(1);
    expect(html.indexOf("i=7")).toBeGreaterThan(html.indexOf("Heap backing array"));
  });
});

describe("TreeCanvas top band", () => {
  const heightOf = (html: string): number => Number(/height:(\d+)px/.exec(html.slice(html.indexOf("origin-top-left")))?.[1]);

  it("reserves the same chip band whatever the number of pointers, and none without pointers", () => {
    const one = renderTree(BINARY, [frame(1, [["root", ref(1)]])]);
    const three = renderTree(BINARY, [frame(1, [["root", ref(1)], ["a", ref(1)], ["b", ref(1)]])]);
    const none = renderTree(BINARY, [frame(1, [])]);
    expect(heightOf(one)).toBe(heightOf(three));
    expect(heightOf(one)).toBeGreaterThan(heightOf(none) + 60);
  });
});
