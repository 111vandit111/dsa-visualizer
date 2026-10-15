import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class FenwickTree {
  constructor(nums) {
    this.n = nums.length;
    this.tree = new Array(this.n + 1).fill(0); // 1-indexed: tree[0] is unused
    for (let k = 0; k < this.n; k++) this.update(k, nums[k]);
  }

  // nums[index] += delta (0-based index)
  update(index, delta) {
    // Climb to every node whose range contains position index + 1
    for (let i = index + 1; i <= this.n; i += i & -i) {
      this.tree[i] += delta;
    }
  }

  // nums[0] + ... + nums[index]
  prefixSum(index) {
    let sum = 0;
    // Each tree[i] covers the (i & -i) positions ending at i; jump left past them
    for (let i = index + 1; i > 0; i -= i & -i) {
      sum += this.tree[i];
    }
    return sum;
  }

  // nums[l] + ... + nums[r]
  rangeSum(l, r) {
    return this.prefixSum(r) - this.prefixSum(l - 1);
  }
}
`;

const DESCRIPTION = `A **Fenwick tree** (binary indexed tree, BIT) keeps prefix sums of an array that keeps changing. Both "add \`delta\` to \`nums[i]\`" and "sum of \`nums[0..i]\`" run in **O(log n)** using one array of \`n + 1\` numbers and a single bit trick, \`i & -i\`. Range sums follow from two prefix sums. It is the go-to structure for counting inversions, frequency tables, order statistics and "range sum with updates" problems. This sample implements \`update(index, delta)\`, \`prefixSum(index)\` and \`rangeSum(l, r)\` with 0-based indices on the outside and 1-based positions inside.

## Intuition

Every positive integer splits into powers of two: \`7 = 4 + 2 + 1\`. A Fenwick tree splits every **prefix** the same way. Position \`i\` (1-based) stores the sum of a block that **ends at i** and has length \`lowbit(i) = i & -i\`, the value of the lowest set bit of \`i\`:

| i | binary | i & -i | tree[i] covers |
|---|--------|--------|----------------|
| 1 | 0001 | 1 | [1, 1] |
| 2 | 0010 | 2 | [1, 2] |
| 3 | 0011 | 1 | [3, 3] |
| 4 | 0100 | 4 | [1, 4] |
| 5 | 0101 | 1 | [5, 5] |
| 6 | 0110 | 2 | [5, 6] |
| 7 | 0111 | 1 | [7, 7] |
| 8 | 1000 | 8 | [1, 8] |

**Why \`i & -i\` is the lowest set bit:** in two's complement, \`-i = ~i + 1\`. Inverting \`i\` turns its trailing zeros into ones and its lowest one into a zero; adding 1 carries through those ones and stops exactly at that bit. All higher bits are inverted, so \`i & -i\` keeps only the lowest set bit (\`6 = 0110\`, \`-6 = …1010\`, \`6 & -6 = 0010 = 2\`).

- **Prefix sum:** \`i -= i & -i\` strips the lowest set bit, jumping to the block just left of the current one. \`prefix(7)\` = \`tree[7] + tree[6] + tree[4]\` (\`0111 → 0110 → 0100 → 0000\`).
- **Update:** \`i += i & -i\` jumps to the next block that also contains position \`i\`. Updating position 3 touches \`tree[3], tree[4], tree[8]\` (\`0011 → 0100 → 1000\`).

## How it works

1. **constructor(nums):** make \`tree\` of \`n + 1\` zeros and call \`update(k, nums[k])\` for every element.
2. **update(index, delta):** start at \`i = index + 1\`; while \`i ≤ n\`, add \`delta\` to \`tree[i]\` and move to \`i + (i & -i)\`.
3. **prefixSum(index):** start at \`i = index + 1\`; while \`i > 0\`, add \`tree[i]\` and move to \`i - (i & -i)\`.
4. **rangeSum(l, r):** \`prefixSum(r) − prefixSum(l − 1)\`; \`prefixSum(-1)\` starts at \`i = 0\` and returns 0.

## Walkthrough

Case 0: \`nums = [3, 2, -1, 6, 5, 4, -3, 3]\` (n = 8).

After the constructor (each \`tree[i]\` holds the sum of its block):

\`\`\`
i         1   2   3   4   5   6   7   8
covers   1-1 1-2 3-3 1-4 5-5 5-6 7-7 1-8
tree[i]   3   5  -1  10   5   9  -3  19
\`\`\`

\`\`\`
prefixSum(4)    i = 5 (0101): +tree[5] = 5
                i = 4 (0100): +tree[4] = 10        -> 15
rangeSum(2, 5)  prefixSum(5): i = 6, 4 -> 9 + 10 = 19
                prefixSum(1): i = 2    -> 5
                19 - 5                              -> 14
update(3, 2)    i = 4 (0100): tree[4] 10 -> 12
                i = 8 (1000): tree[8] 19 -> 21
                i = 16 > 8, stop
rangeSum(2, 5)  prefixSum(5) = 9 + 12 = 21; 21 - 5  -> 16
prefixSum(7)    i = 8: tree[8]                       -> 21
\`\`\`

## Complexity

| Operation | Time | Why |
|-----------|------|-----|
| update | O(log n) | each step moves the lowest set bit left, at most log2 n + 1 steps |
| prefixSum | O(log n) | each step clears one set bit of \`i\` |
| rangeSum | O(log n) | two prefix sums |
| build (n updates) | O(n log n) | an O(n) build exists: add \`tree[i]\` into \`tree[i + (i & -i)]\` once, left to right |
| space | O(n) | one array of n + 1 numbers |

## When to use it

- **Strengths:** tiny code, n + 1 numbers of memory, very fast in practice, easy to extend to 2D and to "range update, point query" (store differences).
- **vs. prefix-sum array:** O(1) queries but O(n) per update; use it only when the data is static.
- **vs. segment tree:** a segment tree handles non-invertible operations (min, max, gcd) and lazy range updates; a Fenwick tree needs an inverse (sums, xor) to turn prefixes into ranges.
- **Typical uses:** counting inversions, "how many smaller elements to the right", running rank of a value, dynamic frequency tables.
- **Weaknesses:** not intuitive to read, and range min/max queries do not work with the prefix trick.

## Common pitfalls

- Using index 0 inside the tree: \`0 & -0 = 0\`, so the update loop never advances (infinite loop). Shift to 1-based positions.
- Mixing "set to value" with "add delta": \`update\` adds; to set, add \`val − current\`.
- Off-by-one in \`rangeSum\`: subtract \`prefixSum(l − 1)\`, not \`prefixSum(l)\`.
- Thinking \`tree[i]\` is \`nums[i]\`: it is the sum of a block of length \`i & -i\`.
- Operator precedence: in JS (and C, Java) \`&\` binds weaker than \`+\`, so \`i = i + i & -i\` means \`(i + i) & -i\`. Write \`i += i & -i\` or \`i + (i & -i)\`.

## What to watch in the visualizer

- \`this.tree\` is shown as an array; \`i\` highlights the slot being read or written.
- In \`update(3, 2)\`, watch \`i\` jump right (\`4 → 8\`); in \`prefixSum(4)\`, watch it jump left (\`5 → 4 → 0\`) while \`sum\` grows.
- During the constructor, every \`update\` call for \`k\` walks a different chain, and \`tree[8]\` collects all eight values.

## Example

\`\`\`
Input:
  ["FenwickTree", "prefixSum", "rangeSum", "update", "rangeSum", "prefixSum"]
  [[[3, 2, -1, 6, 5, 4, -3, 3]], [4], [2, 5], [3, 2], [2, 5], [7]]
Output:
  [null, 15, 14, null, 16, 21]
\`\`\`

## Constraints

- \`1 <= nums.length <= 10^5\`
- \`0 <= index < nums.length\`, \`0 <= l <= r < nums.length\`
- Sums fit in a double-precision integer (\`|sum| < 2^53\`).
`;

export function buildFenwickTree(): QuestionInput {
  return {
    slug: "fenwick-tree",
    title: "Fenwick Tree (Binary Indexed Tree)",
    difficulty: "Medium",
    tags: ["tree", "fenwick-tree", "bit-manipulation", "range-query", "design"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        ops: ["FenwickTree", "prefixSum", "rangeSum", "update", "rangeSum", "prefixSum"],
        args: [[[3, 2, -1, 6, 5, 4, -3, 3]], [4], [2, 5], [3, 2], [2, 5], [7]],
        expected: [null, 15, 14, null, 16, 21],
      },
      {
        // n not a power of two; ranges touching both ends
        ops: ["FenwickTree", "rangeSum", "rangeSum", "update", "update", "rangeSum", "prefixSum"],
        args: [[[1, 2, 3, 4, 5]], [0, 4], [4, 4], [0, 10], [4, -5], [0, 0], [4]],
        expected: [null, 15, 5, null, null, 11, 20],
      },
      {
        ops: ["FenwickTree", "prefixSum", "update", "rangeSum"],
        args: [[[0]], [0], [0, 7], [0, 0]],
        expected: [null, 0, null, 7],
      },
    ],
    visualHints: {
      "this.tree": "array",
    },
  };
}
