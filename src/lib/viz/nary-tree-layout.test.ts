import { describe, expect, it } from "vitest";
import { layoutNaryTree } from "./nary-tree-layout";

function levelsOf(layout: ReturnType<typeof layoutNaryTree>, reachable: number): Map<number, number[]> {
  const levels = new Map<number, number[]>();
  layout.positions.slice(0, reachable).forEach((position) => levels.set(position.depth, [...(levels.get(position.depth) ?? []), position.x]));
  return levels;
}

describe("layoutNaryTree", () => {
  it("handles empty and single-node trees", () => {
    expect(layoutNaryTree(0, () => [])).toEqual({ positions: [], width: 0, levelCount: 0 });
    const single = layoutNaryTree(1, () => []);
    expect(single).toEqual({ positions: [{ x: 0, depth: 0 }], width: 0, levelCount: 1 });
  });

  it("lays a ternary tree out with leaves on consecutive slots and parents centred", () => {
    const kids: Record<number, number[]> = { 0: [1, 2, 3], 1: [4, 5], 3: [6] };
    const layout = layoutNaryTree(7, (index) => kids[index] ?? []);
    const xOf = layout.positions.map((position) => position.x);
    expect([xOf[4], xOf[5], xOf[2], xOf[6]]).toEqual([0, 1, 2, 3]);
    expect(xOf[1]).toBe(0.5);
    expect(xOf[3]).toBe(3);
    expect(xOf[0]).toBe((xOf[1] + xOf[3]) / 2);
    expect(layout.width).toBe(3);
    expect(layout.levelCount).toBe(3);
  });

  it("never overlaps nodes on one level", () => {
    const kids = (index: number): number[] => (index < 13 ? [3 * index + 1, 3 * index + 2, 3 * index + 3] : []);
    const layout = layoutNaryTree(40, kids);
    for (const xs of levelsOf(layout, 40).values()) {
      const sorted = [...xs].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) expect(sorted[i] - sorted[i - 1]).toBeGreaterThanOrEqual(1);
    }
  });

  it("stacks a chain in one column", () => {
    const layout = layoutNaryTree(4, (index) => (index < 3 ? [index + 1] : []));
    expect(layout.positions.map((position) => position.x)).toEqual([0, 0, 0, 0]);
    expect(layout.positions.map((position) => position.depth)).toEqual([0, 1, 2, 3]);
    expect(layout.levelCount).toBe(4);
  });

  it("ignores cycles and out-of-range children, and parks unreachable nodes at the origin", () => {
    const kids: Record<number, number[]> = { 0: [1, 9], 1: [0, 1, 2] };
    const layout = layoutNaryTree(4, (index) => kids[index] ?? []);
    expect(layout.positions[2].depth).toBe(2);
    expect(layout.positions[3]).toEqual({ x: 0, depth: 0 });
    expect(layout.levelCount).toBe(3);
  });
});
