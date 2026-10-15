import { describe, expect, it } from "vitest";
import { layoutGraph } from "./graph-layout";

type Edge = { from: number; to: number };

const ring = (count: number): Edge[] => Array.from({ length: count }, (_, index) => ({ from: index, to: (index + 1) % count }));

function minimumDistance(positions: readonly { x: number; y: number }[]): number {
  let smallest = Infinity;
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      smallest = Math.min(smallest, Math.hypot(positions[i].x - positions[j].x, positions[i].y - positions[j].y));
    }
  }
  return smallest;
}

function expectSane(count: number, edges: Edge[]): void {
  const layout = layoutGraph(count, edges);
  expect(layout.positions).toHaveLength(count);
  for (const { x, y } of layout.positions) {
    expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(layout.width);
    expect(y).toBeLessThanOrEqual(layout.height);
  }
  expect(minimumDistance(layout.positions)).toBeGreaterThanOrEqual(1);
  expect(Math.min(...layout.positions.map((p) => p.x))).toBe(0);
  expect(Math.min(...layout.positions.map((p) => p.y))).toBe(0);
}

describe("layoutGraph", () => {
  it("is deterministic: the same input gives identical output", () => {
    const edges = [...ring(12), { from: 0, to: 6 }, { from: 3, to: 9 }];
    expect(layoutGraph(12, edges)).toEqual(layoutGraph(12, edges));
  });

  it("keeps nodes at least one unit apart for rings, trees, cliques and dense graphs", () => {
    expectSane(8, ring(8));
    expectSane(15, Array.from({ length: 14 }, (_, index) => ({ from: Math.floor(index / 2), to: index + 1 })));
    const clique: Edge[] = [];
    for (let i = 0; i < 10; i++) for (let j = i + 1; j < 10; j++) clique.push({ from: i, to: j });
    expectSane(10, clique);
    const dense: Edge[] = [];
    for (let i = 0; i < 40; i++) for (let k = 1; k <= 3; k++) dense.push({ from: i, to: (i * 7 + k * 11) % 40 });
    expectSane(40, dense);
  });

  it("handles no nodes, one node and two nodes", () => {
    expect(layoutGraph(0, [])).toEqual({ positions: [], width: 0, height: 0 });
    expect(layoutGraph(1, [])).toEqual({ positions: [{ x: 0, y: 0 }], width: 0, height: 0 });
    expectSane(2, [{ from: 0, to: 1 }]);
    expectSane(1, [{ from: 0, to: 0 }]);
  });

  it("lays out edge-less and disconnected graphs without NaN", () => {
    expectSane(5, []);
    expectSane(10, [{ from: 0, to: 1 }, { from: 2, to: 3 }]);
    const apart = layoutGraph(10, [{ from: 0, to: 1 }, { from: 2, to: 3 }]);
    expect(Math.max(apart.width, apart.height)).toBeLessThan(20);
  });

  it("ignores self loops, repeated edges and edges to missing nodes", () => {
    expectSane(4, [{ from: 1, to: 1 }, { from: 0, to: 1 }, { from: 1, to: 0 }, { from: 0, to: 1 }, { from: 2, to: 9 }, { from: -1, to: 2 }]);
    expect(layoutGraph(4, [{ from: 1, to: 1 }])).toEqual(layoutGraph(4, []));
  });

  it("pulls connected nodes closer than unconnected ones", () => {
    const { positions } = layoutGraph(6, [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 0 }, { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 5, to: 3 }]);
    const between = (a: number, b: number) => Math.hypot(positions[a].x - positions[b].x, positions[a].y - positions[b].y);
    expect(between(0, 1)).toBeLessThan(between(0, 4));
    expect(between(3, 4)).toBeLessThan(between(2, 5));
  });

  it("stays fast for 40 nodes and 120 edges", () => {
    const edges: Edge[] = [];
    for (let i = 0; i < 40; i++) for (let k = 1; k <= 3; k++) edges.push({ from: i, to: (i * 5 + k * 13) % 40 });
    layoutGraph(40, edges);
    // Best of several runs: a busy machine (parallel test workers) slows single runs, not the algorithm.
    const timings = Array.from({ length: 7 }, () => {
      const started = performance.now();
      layoutGraph(40, edges);
      return performance.now() - started;
    });
    expect(Math.min(...timings)).toBeLessThan(100);
  });
});
