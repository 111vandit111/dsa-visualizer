import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class SegmentTree {
  constructor(nums) {
    this.n = nums.length;
    // Node i covers a range of nums; its children are 2i+1 and 2i+2. 4n slots always suffice.
    this.tree = new Array(4 * this.n).fill(0);
    if (this.n > 0) this.build(nums, 0, 0, this.n - 1);
  }

  // Fills tree[node] with the sum of nums[lo..hi]
  build(nums, node, lo, hi) {
    if (lo === hi) {
      this.tree[node] = nums[lo]; // leaf: a single element
      return;
    }
    const mid = Math.floor((lo + hi) / 2);
    this.build(nums, 2 * node + 1, lo, mid);
    this.build(nums, 2 * node + 2, mid + 1, hi);
    this.tree[node] = this.tree[2 * node + 1] + this.tree[2 * node + 2];
  }

  // Sum of nums[l..r]
  query(l, r) {
    return this.queryRange(0, 0, this.n - 1, l, r);
  }

  queryRange(node, lo, hi, l, r) {
    if (r < lo || hi < l) return 0; // no overlap
    if (l <= lo && hi <= r) return this.tree[node]; // fully inside: use the stored sum
    // Partial overlap: ask both halves
    const mid = Math.floor((lo + hi) / 2);
    const leftSum = this.queryRange(2 * node + 1, lo, mid, l, r);
    const rightSum = this.queryRange(2 * node + 2, mid + 1, hi, l, r);
    return leftSum + rightSum;
  }

  // nums[index] = val
  update(index, val) {
    this.updatePoint(0, 0, this.n - 1, index, val);
  }

  updatePoint(node, lo, hi, index, val) {
    if (lo === hi) {
      this.tree[node] = val;
      return;
    }
    const mid = Math.floor((lo + hi) / 2);
    if (index <= mid) this.updatePoint(2 * node + 1, lo, mid, index, val);
    else this.updatePoint(2 * node + 2, mid + 1, hi, index, val);
    // Recompute this node's sum on the way back up
    this.tree[node] = this.tree[2 * node + 1] + this.tree[2 * node + 2];
  }
}
`;

const DESCRIPTION = `A **segment tree** answers range queries (here: the sum of \`nums[l..r]\`) and point updates in **O(log n)** each. Every node stores the answer for one contiguous range of the array; the root covers everything and each child covers half of its parent's range. A prefix-sum array answers sums in O(1) but needs O(n) per update; a segment tree balances both. This sample implements \`build\`, \`query(l, r)\` and \`update(index, val)\` with a recursive, array-backed tree of size \`4n\`.

## Intuition

Imagine a company org chart where every manager knows the total sales of their team. To get the sales of employees 1 to 3 you don't ask every employee: you ask the managers whose whole team lies inside that range and only drill down where a team is cut in half by the range boundary.

The tree is stored in a flat array like a binary heap: node \`i\` has children \`2i + 1\` and \`2i + 2\`. Each recursive call carries its **range** \`[lo, hi]\`:

- the root is node 0 with range \`[0, n − 1]\`,
- node \`(node, lo, hi)\` splits at \`mid = ⌊(lo + hi) / 2⌋\` into \`(2·node + 1, lo, mid)\` and \`(2·node + 2, mid + 1, hi)\`,
- a leaf has \`lo === hi\` and stores \`nums[lo]\`.

The invariant: \`tree[node]\` is always the sum of \`nums[lo..hi]\` for that node's range.

**Why 4n slots:** the tree has height \`⌈log2 n⌉\`, so the largest index used is below \`2 · 2^⌈log2 n⌉ ≤ 4n\`. When \`n\` is a power of two only \`2n − 1\` slots are used; the rest stay \`0\`.

## How it works

1. **build(node, lo, hi):** if \`lo === hi\`, store \`nums[lo]\`. Otherwise build both halves recursively and store their sum (post-order: children first).
2. **query(l, r)** visits \`queryRange(node, lo, hi)\` from the root:
   - **no overlap** (\`r < lo\` or \`hi < l\`): return 0,
   - **total overlap** (\`l ≤ lo\` and \`hi ≤ r\`): return \`tree[node]\` without going deeper,
   - **partial overlap:** return the sum of both children's answers.
3. **update(index, val):** walk down toward the leaf for \`index\` (left if \`index ≤ mid\`, else right), overwrite the leaf, then recompute each ancestor's sum on the way back up.

## Walkthrough

Case 0: \`nums = [2, 1, 5, 3]\`, then \`query(1, 3)\`, \`update(2, 4)\`, \`query(1, 3)\`, \`query(0, 2)\`.

**build** (children are filled before their parent):

\`\`\`
node  range   sum
 3    [0,0]    2
 4    [1,1]    1
 1    [0,1]    3   = tree[3] + tree[4]
 5    [2,2]    5
 6    [3,3]    3
 2    [2,3]    8   = tree[5] + tree[6]
 0    [0,3]   11   = tree[1] + tree[2]
tree = [11, 3, 8, 2, 1, 5, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0]   (slots 7..15 unused)
\`\`\`

**query(1, 3)**

\`\`\`
node 0 [0,3]  partial -> split at mid 1
  node 1 [0,1]  partial -> split at mid 0
    node 3 [0,0]  no overlap        -> 0
    node 4 [1,1]  inside            -> 1
  node 2 [2,3]  inside              -> 8
answer 0 + 1 + 8 = 9
\`\`\`

**update(2, 4):** \`2 > mid 1\` → node 2 \`[2,3]\`; \`2 ≤ mid 2\` → node 5 \`[2,2]\` becomes 4. Back up: node 2 = 4 + 3 = 7, node 0 = 3 + 7 = 10.

\`\`\`
tree = [10, 3, 7, 2, 1, 4, 3, 0, ...]
\`\`\`

**query(1, 3)** now returns \`1 + 7 = 8\`; **query(0, 2)** takes node 1 \`[0,1]\` whole (3) and node 5 \`[2,2]\` (4) for \`7\`.

## Complexity

| Operation | Time | Why |
|-----------|------|-----|
| build | O(n) | each of the ~2n nodes is computed once |
| query | O(log n) | at most 2 partially overlapping nodes per level keep recursing (≤ 4 nodes visited per level) |
| update | O(log n) | one root-to-leaf path, then sums recomputed on the way back |
| space | O(n) | \`4n\` array slots |

## When to use it

- **Strengths:** handles any associative operation (sum, min, max, gcd, xor) by changing the combine step; extends to range updates with lazy propagation and to persistent or 2D versions.
- **vs. prefix sums:** O(1) queries but O(n) updates; best when the array never changes.
- **vs. Fenwick tree:** a Fenwick tree is shorter, uses \`n + 1\` slots and is faster in practice, but only works for invertible operations like sum (no range min/max).
- **vs. sqrt decomposition:** simpler, but O(√n) per operation.
- **Weaknesses:** more code and memory than a Fenwick tree; recursion overhead (an iterative bottom-up version avoids it).

## Common pitfalls

- Allocating only \`2n\` slots for the recursive layout: with \`n\` not a power of two, indices can exceed \`2n\` (use \`4n\`).
- Mixing the node index with the array index: \`node\` addresses \`tree\`, while \`lo\`, \`hi\` and \`index\` address \`nums\`.
- Wrong overlap tests (\`r < lo || hi < l\` is "no overlap"); off-by-one with \`mid\` versus \`mid + 1\` for the right child.
- Forgetting to recompute the ancestors after an update, or treating \`update\` as "add delta" when the API says "set value".
- Returning the wrong neutral value for no overlap (\`0\` for sum, \`Infinity\` for min, \`-Infinity\` for max).

## What to watch in the visualizer

- \`this.tree\` is drawn as a binary heap: the tree view shows each node's sum, the array below it shows the real storage, unused slots included.
- \`node\` is the only index into \`tree\`, so its chip marks the slot being visited, both in the tree view and in the array row.
- \`lo\`, \`hi\` and \`mid\` are positions in \`nums\`, not in \`tree\`: during \`build\` they appear as chips on \`nums\`; in \`queryRange\` and \`updatePoint\` read them in the locals panel to see which range the current node covers.
- During \`build\`, sums appear bottom-up; during \`update\`, watch the changed leaf and then its ancestors flash as they are recomputed.
- The call stack shows the recursion: \`queryRange\` returns early (no overlap or total overlap) on most branches.

## Example

\`\`\`
Input:
  ["SegmentTree", "query", "update", "query", "query"]
  [[[2, 1, 5, 3]], [1, 3], [2, 4], [1, 3], [0, 2]]
Output:
  [null, 9, null, 8, 7]
\`\`\`

## Constraints

- \`1 <= nums.length <= 3 * 10^4\`
- \`0 <= index < nums.length\`, \`0 <= l <= r < nums.length\`
- At most \`3 * 10^4\` calls to \`update\` and \`query\`.
`;

export function buildSegmentTree(): QuestionInput {
  return {
    slug: "segment-tree",
    title: "Segment Tree (Range Sum)",
    difficulty: "Medium",
    tags: ["tree", "segment-tree", "range-query", "divide-and-conquer", "design"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        ops: ["SegmentTree", "query", "update", "query", "query"],
        args: [[[2, 1, 5, 3]], [1, 3], [2, 4], [1, 3], [0, 2]],
        expected: [null, 9, null, 8, 7],
      },
      {
        // n not a power of two: uneven halves
        ops: ["SegmentTree", "query", "update", "query", "query", "query"],
        args: [[[1, 3, 5, 7, 9]], [0, 4], [1, 10], [1, 3], [4, 4], [0, 0]],
        expected: [null, 25, null, 22, 9, 1],
      },
      {
        ops: ["SegmentTree", "query", "update", "query"],
        args: [[[7]], [0, 0], [0, -2], [0, 0]],
        expected: [null, 7, null, -2],
      },
      {
        // negative values and a full-range query
        ops: ["SegmentTree", "query", "update", "query", "query"],
        args: [[[-1, 4, -2, 6, 0, 3, -5]], [2, 5], [3, 1], [0, 6], [3, 3]],
        expected: [null, 7, null, 0, 1],
      },
    ],
    visualHints: {
      "this.tree": "heap",
    },
  };
}
