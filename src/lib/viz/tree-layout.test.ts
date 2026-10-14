import { describe, expect, it } from "vitest";
import { heapChildren, heapParent, layoutBinaryTree, type ChildPair } from "./tree-layout";

function levelsOf(layout: ReturnType<typeof layoutBinaryTree>): Map<number, number[]> {
  const levels = new Map<number, number[]>();
  layout.positions.forEach((position) => levels.set(position.depth, [...(levels.get(position.depth) ?? []), position.x]));
  return levels;
}

describe("layoutBinaryTree", () => {
  it("handles empty and single-node trees", () => {
    expect(layoutBinaryTree(0, () => [null, null])).toEqual({ positions: [], width: 0, levelCount: 0 });
    const single = layoutBinaryTree(1, () => [null, null]);
    expect(single.positions).toEqual([{ x: 0, depth: 0 }]);
    expect(single.levelCount).toBe(1);
  });

  it("centres a parent over two children", () => {
    const layout = layoutBinaryTree(3, heapChildren(3));
    const [root, left, right] = layout.positions;
    expect(left.x).toBeLessThan(root.x);
    expect(right.x).toBeGreaterThan(root.x);
    expect(root.x - left.x).toBeCloseTo(right.x - root.x);
    expect(layout.levelCount).toBe(2);
  });

  it("never overlaps nodes on the same level of a complete tree", () => {
    const layout = layoutBinaryTree(31, heapChildren(31));
    for (const xs of levelsOf(layout).values()) {
      const sorted = [...xs].sort((a, b) => a - b);
      sorted.slice(1).forEach((x, i) => expect(x - sorted[i]).toBeGreaterThanOrEqual(1 - 1e-9));
    }
    expect(layout.levelCount).toBe(5);
    expect(Math.min(...layout.positions.map((p) => p.x))).toBe(0);
  });

  it("packs a complete tree by its leaves, not its node count", () => {
    expect(layoutBinaryTree(15, heapChildren(15)).width).toBeCloseTo(7, 5);
  });

  it("keeps a skewed tree finite and ordered by depth", () => {
    const count = 200;
    const rightChain = (index: number): ChildPair => [null, index + 1 < count ? index + 1 : null];
    const layout = layoutBinaryTree(count, rightChain);
    expect(layout.levelCount).toBe(count);
    expect(layout.positions[count - 1].depth).toBe(count - 1);
    expect(layout.positions.every((p) => Number.isFinite(p.x))).toBe(true);
  });

  it("separates deep subtrees that would collide", () => {
    // 0 -> (1, 2); 1 -> (null, 3); 2 -> (4, null): the inner grandchildren must not touch.
    const children: Record<number, ChildPair> = { 0: [1, 2], 1: [null, 3], 2: [4, null], 3: [null, null], 4: [null, null] };
    const layout = layoutBinaryTree(5, (index) => children[index]);
    expect(layout.positions[4].x - layout.positions[3].x).toBeGreaterThanOrEqual(1 - 1e-9);
  });

  it("ignores unreachable and repeated nodes and caps the node count", () => {
    const cyclic = layoutBinaryTree(3, (index) => (index === 0 ? [1, 1] : index === 1 ? [0, 2] : [null, null]));
    expect(cyclic.positions).toHaveLength(3);
    expect(cyclic.positions.every((p) => Number.isFinite(p.x))).toBe(true);
    const huge = layoutBinaryTree(100_000, heapChildren(100_000));
    expect(huge.positions.length).toBeLessThanOrEqual(512);
  });
});

describe("heap helpers", () => {
  it("computes children within bounds and the parent index", () => {
    expect(heapChildren(4)(1)).toEqual([3, null]);
    expect(heapChildren(4)(0)).toEqual([1, 2]);
    expect(heapChildren(1)(0)).toEqual([null, null]);
    expect(heapParent(0)).toBeNull();
    expect(heapParent(1)).toBe(0);
    expect(heapParent(6)).toBe(2);
  });
});
