import { VIZ_LIMITS } from "./constants";
import type { TreeLayout, TreePosition } from "./tree-layout";

interface Walk {
  /** Reachable nodes in pre-order (children left to right). */
  order: number[];
  /** Accepted children per node (in range, first discovery wins). */
  children: Map<number, number[]>;
  depths: Map<number, number>;
}

/** Iterative pre-order from node 0; each node is visited once (cycles/sharing ignored). */
function walkTree(count: number, childrenOf: (index: number) => readonly number[]): Walk {
  const walk: Walk = { order: [], children: new Map(), depths: new Map([[0, 0]]) };
  const seen = new Set<number>([0]);
  const stack: number[] = [0];
  while (stack.length > 0) {
    const index = stack.pop() as number;
    walk.order.push(index);
    const accepted: number[] = [];
    for (const child of childrenOf(index)) {
      if (!Number.isInteger(child) || child < 0 || child >= count || seen.has(child)) continue;
      seen.add(child);
      accepted.push(child);
      walk.depths.set(child, (walk.depths.get(index) as number) + 1);
    }
    walk.children.set(index, accepted);
    for (let k = accepted.length - 1; k >= 0; k--) stack.push(accepted[k]);
  }
  return walk;
}

/**
 * Layout for an N-ary tree whose root is node 0: leaves take consecutive x slots left to right and every inner
 * node sits at the midpoint of its first and last child, so subtrees never overlap. Iterative; `count` is capped
 * at VIZ_LIMITS.maxLayoutNodes and nodes unreachable from the root get `{ x: 0, depth: 0 }`.
 */
export function layoutNaryTree(count: number, childrenOf: (index: number) => readonly number[]): TreeLayout {
  const total = Math.min(Math.max(count, 0), VIZ_LIMITS.maxLayoutNodes);
  if (total === 0) return { positions: [], width: 0, levelCount: 0 };
  const walk = walkTree(total, childrenOf);
  const xs = new Map<number, number>();
  let nextLeaf = 0;
  for (const index of walk.order) {
    if ((walk.children.get(index) as number[]).length === 0) xs.set(index, nextLeaf++);
  }
  for (let k = walk.order.length - 1; k >= 0; k--) {
    const kids = walk.children.get(walk.order[k]) as number[];
    if (kids.length > 0) xs.set(walk.order[k], ((xs.get(kids[0]) as number) + (xs.get(kids[kids.length - 1]) as number)) / 2);
  }
  const positions: TreePosition[] = Array.from({ length: total }, () => ({ x: 0, depth: 0 }));
  let width = 0;
  let deepest = 0;
  for (const index of walk.order) {
    const x = xs.get(index) as number;
    const depth = walk.depths.get(index) as number;
    positions[index] = { x, depth };
    width = Math.max(width, x);
    deepest = Math.max(deepest, depth);
  }
  return { positions, width, levelCount: deepest + 1 };
}
