import { VIZ_LIMITS } from "./constants";

export type ChildPair = readonly [number | null, number | null];

export interface TreePosition {
  /** Horizontal position in node-spacing units, left edge at 0. */
  x: number;
  depth: number;
}

export interface TreeLayout {
  positions: TreePosition[];
  /** Horizontal extent in node-spacing units. */
  width: number;
  /** Number of levels. */
  levelCount: number;
}

/** Minimum distance between neighbouring nodes on one level. */
const MIN_GAP = 1;
/** Offset of a lone child relative to its parent. */
const LONE_CHILD_OFFSET = 0.5;

interface Contour {
  /** Leftmost x per level below the node, relative to the node (index 0 is the node itself). */
  left: number[];
  right: number[];
}

const LEAF_CONTOUR: Contour = { left: [0], right: [0] };

function shiftedContour(child: Contour, offset: number): Contour {
  return { left: child.left.map((x) => x + offset), right: child.right.map((x) => x + offset) };
}

/** Contour of a node whose subtrees below it are `first` and (optionally) `second`, already in the node's coordinates. */
function parentContour(first: Contour, second: Contour | null): Contour {
  const levels = Math.max(first.left.length, second?.left.length ?? 0);
  const left: number[] = [0];
  const right: number[] = [0];
  for (let level = 0; level < levels; level++) {
    const lefts = [first.left[level], second?.left[level]].filter((x): x is number => x !== undefined);
    const rights = [first.right[level], second?.right[level]].filter((x): x is number => x !== undefined);
    left.push(Math.min(...lefts));
    right.push(Math.max(...rights));
  }
  return { left, right };
}

function separation(leftSubtree: Contour, rightSubtree: Contour): number {
  const shared = Math.min(leftSubtree.right.length, rightSubtree.left.length);
  let gap = MIN_GAP;
  for (let level = 0; level < shared; level++) {
    gap = Math.max(gap, leftSubtree.right[level] - rightSubtree.left[level] + MIN_GAP);
  }
  return gap;
}

/** Iterative post-order over nodes reachable from the root; each node is visited once (cycles/duplicates ignored). */
function postOrder(count: number, childrenOf: (index: number) => ChildPair): number[] {
  const order: number[] = [];
  const seen = new Set<number>([0]);
  const stack: number[] = [0];
  while (stack.length > 0) {
    const index = stack.pop() as number;
    order.push(index);
    for (const child of childrenOf(index)) {
      if (child === null || child < 0 || child >= count || seen.has(child)) continue;
      seen.add(child);
      stack.push(child);
    }
  }
  return order.reverse();
}

interface Placement {
  contours: Map<number, Contour>;
  /** x of each node relative to its parent. */
  offsets: Map<number, number>;
}

function placeNode(index: number, children: ChildPair, placement: Placement): void {
  const [leftIndex, rightIndex] = children;
  const leftContour = leftIndex === null ? undefined : placement.contours.get(leftIndex);
  const rightContour = rightIndex === null ? undefined : placement.contours.get(rightIndex);
  let contour = LEAF_CONTOUR;
  if (leftIndex !== null && rightIndex !== null && leftContour && rightContour) {
    const gap = separation(leftContour, rightContour);
    placement.offsets.set(leftIndex, -gap / 2);
    placement.offsets.set(rightIndex, gap / 2);
    contour = parentContour(shiftedContour(leftContour, -gap / 2), shiftedContour(rightContour, gap / 2));
  } else if (leftIndex !== null && leftContour) {
    placement.offsets.set(leftIndex, -LONE_CHILD_OFFSET);
    contour = parentContour(shiftedContour(leftContour, -LONE_CHILD_OFFSET), null);
  } else if (rightIndex !== null && rightContour) {
    placement.offsets.set(rightIndex, LONE_CHILD_OFFSET);
    contour = parentContour(shiftedContour(rightContour, LONE_CHILD_OFFSET), null);
  }
  placement.contours.set(index, contour);
  for (const child of children) if (child !== null) placement.contours.delete(child);
}

/**
 * Tidy layout for a binary tree whose root is node 0 (Reingold-Tilford style: subtrees are packed as
 * close as the minimum gap allows and parents are centred over their children). Iterative, O(n * height).
 * `count` is capped at VIZ_LIMITS.maxLayoutNodes; nodes unreachable from the root get `{ x: 0, depth: 0 }`.
 */
export function layoutBinaryTree(count: number, childrenOf: (index: number) => ChildPair): TreeLayout {
  const total = Math.min(Math.max(count, 0), VIZ_LIMITS.maxLayoutNodes);
  if (total === 0) return { positions: [], width: 0, levelCount: 0 };
  const placement: Placement = { contours: new Map(), offsets: new Map() };
  const order = postOrder(total, childrenOf);
  for (const index of order) placeNode(index, childrenOf(index), placement);

  const positions: TreePosition[] = Array.from({ length: total }, () => ({ x: 0, depth: 0 }));
  const placed = new Set<number>([0]);
  for (const index of [...order].reverse()) {
    for (const child of childrenOf(index)) {
      const offset = child === null ? undefined : placement.offsets.get(child);
      if (child === null || offset === undefined || placed.has(child)) continue;
      placed.add(child);
      positions[child] = { x: positions[index].x + offset, depth: positions[index].depth + 1 };
    }
  }
  const reachable = new Set(order);
  const xs = positions.filter((_, index) => reachable.has(index)).map((position) => position.x);
  const minX = Math.min(...xs);
  for (const index of reachable) positions[index] = { x: positions[index].x - minX, depth: positions[index].depth };
  const levelCount = Math.max(...[...reachable].map((index) => positions[index].depth)) + 1;
  return { positions, width: Math.max(...xs) - minX, levelCount };
}

/** Children of node `index` in an implicit binary heap of `count` nodes. */
export function heapChildren(count: number): (index: number) => ChildPair {
  return (index) => {
    const left = 2 * index + 1;
    const right = 2 * index + 2;
    return [left < count ? left : null, right < count ? right : null];
  };
}

/** Index of the parent of heap node `index` (null for the root). */
export function heapParent(index: number): number | null {
  return index === 0 ? null : Math.floor((index - 1) / 2);
}
