import { createElement } from "react";
import { describe, expect, it } from "vitest";
import type { SObject, SValue, Trace } from "@/lib/tracer/types";
import { buildGraphModel } from "@/lib/viz/graph-model";
import { arr, frame, num, obj, ref, set, step, table } from "@/lib/viz/test-helpers";
import { edgeShape, loopShape, NODE_RADIUS, outerRadius } from "./graph-geometry";
import { layoutFor } from "./graph-overlay";
import { GraphRenderer } from "./graph-renderer";
import { renderWithViz } from "./render-test-utils";

const ints = (rows: number[][]): SValue[][] => rows.map((row) => row.map((value) => num(value)));

/** Object 1 = array of rows; row k is object k + 2 (plain values). */
function rowObjects(rows: SValue[][]): SObject[] {
  return [arr(1, rows.map((_, index) => ref(index + 2))), ...rows.map((row, index) => arr(index + 2, row))];
}

const traceOf = (...steps: ReturnType<typeof step>[]): Trace => ({ caseIndex: 0, steps, isTruncated: false });

/** A single-step trace holding `objects`, with `locals` in one frame. */
function oneStep(objects: SObject[], locals: [string, SValue][] = [["graph", ref(1)]]): Trace {
  return traceOf(step(0, [frame(1, locals)], table(...objects)));
}

function show(trace: Trace, options: { stepIndex?: number; code?: string } = {}): string {
  const index = options.stepIndex ?? 0;
  const object = trace.steps[index].objects[1];
  return renderWithViz(trace, index, createElement(GraphRenderer, { object, path: "g", depth: 0, ancestors: [] }), { code: options.code });
}

const count = (html: string, needle: string): number => html.split(needle).length - 1;

/** The attribute text React writes for `data-testid="<id>"` (it escapes `>`). */
const testId = (id: string): string => `data-testid="${id.replace(/>/g, "&gt;")}"`;

/** The opening tag of the element carrying `data-testid="<id>"`. */
function tagOf(html: string, id: string): string {
  const at = html.indexOf(testId(id));
  if (at < 0) throw new Error(`no element ${id}`);
  return html.slice(html.lastIndexOf("<", at), html.indexOf(">", at) + 1);
}
function attrOf(tag: string, name: string): string | null {
  return new RegExp(` ${name}="([^"]*)"`).exec(tag)?.[1] ?? null;
}

const SQUARE: number[][] = [[1, 3], [0, 2], [1, 3], [0, 2]];

describe("adjacency list", () => {
  const html = show(oneStep(rowObjects(ints(SQUARE))));

  it("draws a node per vertex and an edge per undirected pair", () => {
    expect(html).toContain('data-testid="renderer-graph"');
    for (let index = 0; index < 4; index++) expect(html).toContain(`data-testid="graph-node-n${index}"`);
    expect(count(html, 'data-testid="graph-node-')).toBe(4);
    expect(count(html, 'data-testid="graph-edge-')).toBe(4);
    expect(html).toContain(testId("graph-edge-0>1"));
    expect(html).toContain('aria-label="Graph: 4 nodes, 4 edges"');
    expect(html).toContain('role="img"');
    expect(html).toContain("viewBox=");
  });

  it("has no arrowheads, legend or large-graph note", () => {
    expect(html).not.toContain("marker-end");
    expect(html).not.toContain("graph-path-legend");
    expect(html).not.toContain("large graph");
    expect(html).toContain('data-directed="false"');
  });

  it("gives every edge a path with a tooltip", () => {
    const tag = tagOf(html, "graph-edge-0>1");
    expect(attrOf(tag, "d")).toMatch(/^M[\d. -]+ Q[\d. -]+ [\d. -]+$/);
    expect(html).toContain("<title>0 – 1</title>");
  });
});

describe("pointers", () => {
  it("lights the node an index pointer is on", () => {
    const trace = oneStep(rowObjects(ints(SQUARE)), [["graph", ref(1)], ["u", num(2)]]);
    const html = show(trace, { code: "for (const v of graph[u]) {}" });
    expect(attrOf(tagOf(html, "graph-node-n2"), "data-pointers")).toBe("u");
    expect(attrOf(tagOf(html, "graph-node-n1"), "data-pointers")).toBeNull();
    expect(html).toContain('data-testid="pointer-mark"');
    expect(html).toContain('data-pointer="u"');
  });

  it("lights the node object a reference points at, and nodes pointed to by several variables", () => {
    const objects = [
      obj(1, [["val", num(1)], ["neighbors", ref(11)]]),
      obj(2, [["val", num(2)], ["neighbors", ref(12)]]),
      obj(3, [["val", num(3)], ["neighbors", ref(13)]]),
      arr(11, [ref(2), ref(3)]),
      arr(12, [ref(1)]),
      arr(13, [ref(1)]),
    ];
    const html = show(oneStep(objects, [["start", ref(1)], ["node", ref(2)], ["cur", ref(2)]]));
    expect(html).toContain('data-format="node-objects"');
    expect(count(html, 'data-testid="graph-node-')).toBe(3);
    expect(count(html, 'data-testid="graph-edge-')).toBe(2);
    expect(attrOf(tagOf(html, "graph-node-o2"), "data-pointers")).toBe("node,cur");
    expect(attrOf(tagOf(html, "graph-node-o1"), "data-pointers")).toBe("start");
    expect(attrOf(tagOf(html, "graph-node-o3"), "data-pointers")).toBeNull();
    expect(tagOf(html, "graph-node-o1")).toContain("<g");
  });
});

describe("paths", () => {
  const trace = oneStep([...rowObjects(ints(SQUARE)), arr(20, ints([[0, 1, 2]])[0]), arr(21, ints([[1, 0, 3]])[0])], [
    ["graph", ref(1)],
    ["path", ref(20)],
    ["cur", ref(21)],
  ]);
  const html = show(trace);

  it("puts the slots of both paths on a shared node and edge, matching either direction", () => {
    expect(attrOf(tagOf(html, "graph-node-n0"), "data-path-slots")).toBe("0,1");
    expect(attrOf(tagOf(html, "graph-node-n1"), "data-path-slots")).toBe("0,1");
    expect(attrOf(tagOf(html, "graph-node-n2"), "data-path-slots")).toBe("0");
    expect(attrOf(tagOf(html, "graph-node-n3"), "data-path-slots")).toBe("1");
    expect(attrOf(tagOf(html, "graph-edge-0>1"), "data-path-slots")).toBe("0,1");
    expect(attrOf(tagOf(html, "graph-edge-1>2"), "data-path-slots")).toBe("0");
    expect(attrOf(tagOf(html, "graph-edge-0>3"), "data-path-slots")).toBe("1");
    expect(attrOf(tagOf(html, "graph-edge-2>3"), "data-path-slots")).toBeNull();
  });

  it("draws one coloured stroke per path on an edge and none elsewhere", () => {
    expect(html).toContain(testId("graph-stroke-0>1-0"));
    expect(html).toContain(testId("graph-stroke-0>1-1"));
    expect(count(html, 'data-testid="graph-stroke-')).toBe(4);
    expect(tagOf(html, "graph-stroke-0>1-1")).toContain("--ptr-2");
  });

  it("shows a legend with one chip per path", () => {
    expect(count(html, 'data-testid="graph-path-legend-item"')).toBe(2);
    expect(html).toContain('data-path="path"');
    expect(html).toContain('data-path="cur"');
  });

  it("ignores a path that names no node of the graph", () => {
    const far = oneStep([...rowObjects(ints(SQUARE)), arr(20, ints([[7, 8]])[0])], [["graph", ref(1)], ["path", ref(20)]]);
    const plain = show(far);
    expect(plain).not.toContain("graph-path-legend");
    expect(plain).not.toContain("data-path-slots");
  });

  it("tints visited nodes", () => {
    const visited = oneStep([...rowObjects(ints(SQUARE)), set(30, [num(0), num(2)])], [["graph", ref(1)], ["visited", ref(30)]]);
    const tinted = show(visited);
    expect(attrOf(tagOf(tinted, "graph-node-n0"), "data-reached")).toBe("true");
    expect(attrOf(tagOf(tinted, "graph-node-n2"), "data-reached")).toBe("true");
    expect(attrOf(tagOf(tinted, "graph-node-n1"), "data-reached")).toBeNull();
    expect(count(tinted, 'data-reached="true"')).toBe(2);
    expect(tinted).toContain('data-kind="reached"');
  });
});

describe("directed graphs", () => {
  const matrix = ints([[0, 1, 0], [0, 0, 1], [0, 0, 0]]);
  const html = show(oneStep(rowObjects(matrix)));

  it("draws an arrowhead on each edge of a directed matrix", () => {
    expect(html).toContain('data-format="adjacency-matrix"');
    expect(html).toContain('data-directed="true"');
    expect(count(html, 'data-testid="graph-edge-')).toBe(2);
    expect(count(html, "marker-end=")).toBe(2);
    expect(html).toContain("<marker");
    expect(html).toContain("<title>0 → 1</title>");
  });

  it("only follows a path along the direction of its edges", () => {
    const walk = oneStep([...rowObjects(matrix), arr(20, ints([[1, 0]])[0])], [["graph", ref(1)], ["path", ref(20)]]);
    const walked = show(walk);
    expect(attrOf(tagOf(walked, "graph-node-n1"), "data-path-slots")).toBe("0");
    expect(attrOf(tagOf(walked, "graph-edge-0>1"), "data-path-slots")).toBeNull();
    expect(count(walked, 'data-testid="graph-stroke-')).toBe(0);
  });

  it("draws both directions of a pair as arcs, and a self loop", () => {
    const loops = show(oneStep(rowObjects(ints([[0, 1, 1], [1, 0, 0], [0, 0, 1]]))));
    expect(count(loops, 'data-testid="graph-edge-')).toBe(4);
    expect(tagOf(loops, "graph-edge-2>2")).toContain(" C");
    expect(attrOf(tagOf(loops, "graph-edge-0>1"), "d")).not.toBe(attrOf(tagOf(loops, "graph-edge-1>0"), "d"));
    expect(attrOf(tagOf(loops, "graph-edge-0>1"), "d")).not.toContain("Q50 0 ");
  });

  it("labels weighted edges", () => {
    const objects = [
      arr(1, [ref(2), ref(3), ref(4)]),
      arr(2, [ref(5)]),
      arr(3, [ref(6), ref(7)]),
      arr(4, []),
      arr(5, ints([[1, 4]])[0]),
      arr(6, ints([[0, 4]])[0]),
      arr(7, ints([[2, 7]])[0]),
    ];
    const html = show(oneStep(objects));
    expect(count(html, 'data-testid="graph-weight-')).toBe(3);
    expect(html).toContain(testId("graph-weight-1>2"));
    expect(html).toContain(">7<");
  });
});

describe("states", () => {
  it("shows an empty chip for something that is not a graph", () => {
    const html = show(oneStep([arr(1, [num(1), num(2)])]));
    expect(html).toContain('data-testid="renderer-graph"');
    expect(html).toContain("empty graph");
    expect(html).not.toContain("<svg");
  });

  it("caps a large graph and says so", () => {
    const rows = Array.from({ length: 45 }, (_, index) => (index < 44 ? [index + 1] : []));
    const html = show(oneStep(rowObjects(ints(rows))));
    expect(count(html, 'data-testid="graph-node-')).toBe(40);
    expect(html).toContain("large graph");
  });
});

describe("change halos", () => {
  it("flashes the node and the new edge when a neighbour is added to a row", () => {
    const before = rowObjects(ints([[1], [0, 2], [1]]));
    const after = rowObjects(ints([[1, 2], [0, 2], [1]]));
    const trace = traceOf(step(0, [frame(1, [["graph", ref(1)]])], table(...before)), step(1, [frame(1, [["graph", ref(1)]])], table(...after)));
    expect(show(trace, { stepIndex: 0 })).not.toContain("data-halo");
    const html = show(trace, { stepIndex: 1 });
    expect(html).toContain('data-halo="added"');
    expect(html).toContain('data-halo="changed"');
    expect(count(html, 'data-halo="added"')).toBe(1);
  });
});

describe("layout", () => {
  it("reuses the layout while only values change, and recomputes it when an edge does", () => {
    const base = buildGraphModel(table(...rowObjects(ints(SQUARE))), 1, "graph")!;
    const again = buildGraphModel(table(...rowObjects(ints(SQUARE))), 1, "graph")!;
    const other = buildGraphModel(table(...rowObjects(ints([[1], [0, 2], [1]]))), 1, "graph")!;
    expect(layoutFor(again)).toBe(layoutFor(base));
    expect(layoutFor(other)).not.toBe(layoutFor(base));
    expect(layoutFor(base).positions).toHaveLength(4);
  });
});

describe("geometry", () => {
  const a = { x: 0, y: 0 };
  const b = { x: 100, y: 0 };

  it("cuts a straight edge short at both nodes and keeps one path structure for arcs", () => {
    const straight = edgeShape(a, b, { bend: 0, offset: 0, startGap: 18, endGap: 19 });
    expect(straight.d).toBe("M18 0 Q50 0 81 0");
    const arc = edgeShape(a, b, { bend: 20, offset: 0, startGap: 18, endGap: 19 });
    expect(arc.d).toMatch(/^M[\d. -]+ Q50 20 [\d. -]+$/);
    expect(arc.label.y).toBeGreaterThan(5);
  });

  it("shifts a stroke sideways by its offset", () => {
    expect(edgeShape(a, b, { bend: 0, offset: 4, startGap: 18, endGap: 18 }).d).toBe("M18 4 Q50 4 82 4");
  });

  it("puts a self loop below its node, landing on the node's outer ring", () => {
    const loop = loopShape({ x: 50, y: 50 }, outerRadius(0));
    expect(loop.d.startsWith("M41 65.59 C")).toBe(true);
    expect(loop.label.y).toBeGreaterThan(50 + NODE_RADIUS);
    expect(outerRadius(2)).toBeGreaterThan(outerRadius(1));
  });
});
