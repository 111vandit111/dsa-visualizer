import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Solution {
  binarySearch(nums, target) {
    let lo = 0;
    let hi = nums.length - 1;
    // The target, if present, is always inside nums[lo..hi].
    while (lo <= hi) {
      const mid = lo + Math.floor((hi - lo) / 2); // avoids (lo + hi) overflow
      if (nums[mid] === target) {
        return mid; // found
      }
      if (nums[mid] < target) {
        lo = mid + 1; // target can only be in the right half
      } else {
        hi = mid - 1; // target can only be in the left half
      }
    }
    return -1; // the range became empty
  }
}
`;

const DESCRIPTION = `Binary search finds a target in a **sorted** array by repeatedly looking at the middle element and throwing away the half that cannot contain the target. It returns the index of the target, or \`-1\` if it is missing, and needs only O(log n) comparisons.

## Intuition

It is the "guess my number" game: when someone thinks of a number between 1 and 100, you do not guess 1, 2, 3... You guess 50 and ask "higher or lower?". Every answer cuts the remaining possibilities in half. The array being sorted is what makes each answer meaningful.

The invariant: **if the target is in the array, it is inside \`nums[lo..hi]\`**. Each iteration keeps this true while making the range smaller, until either the target is found or the range is empty (\`lo > hi\`).

## How it works

1. Set \`lo = 0\` and \`hi = nums.length - 1\`.
2. While \`lo <= hi\`, compute \`mid = lo + floor((hi - lo) / 2)\`.
3. If \`nums[mid] === target\`, return \`mid\`.
4. If \`nums[mid] < target\`, the target is to the right: set \`lo = mid + 1\`.
5. Otherwise the target is to the left: set \`hi = mid - 1\`.
6. When the loop ends, return \`-1\`.

**Variants.** The same idea can be written recursively (\`search(lo, hi)\` calls itself on one half), but the loop uses O(1) space instead of O(log n) stack. A *lower bound* search (first index with \`nums[i] >= target\`) keeps \`hi = mid\` instead of \`mid - 1\` and stops when \`lo === hi\`; an *upper bound* search does the same with \`>\`. These find insertion points and the first or last of many equal values.

## Walkthrough

Test case 0: \`nums = [2, 5, 8, 12, 16, 23, 38, 56]\`, \`target = 38\`.

| Step | lo | hi | mid | nums[mid] | Decision |
|------|----|----|-----|-----------|----------|
| 1 | 0 | 7 | 3 | 12 | 12 < 38, so \`lo = 4\` |
| 2 | 4 | 7 | 5 | 23 | 23 < 38, so \`lo = 6\` |
| 3 | 6 | 7 | 6 | 38 | equal, return \`6\` |

Three comparisons were enough for 8 elements; the first two discarded 4 and then 2 elements.

## Complexity

| Case | Time | Why |
|------|------|-----|
| Best | O(1) | the target is the very first middle element |
| Average | O(log n) | the range halves every iteration |
| Worst | O(log n) | the target is missing or found on the last possible split |
| Space | O(1) | iterative version stores only \`lo\`, \`hi\` and \`mid\` (recursive: O(log n)) |

## When to use it

- Use it whenever the data is sorted and supports random access (arrays). With a million elements it needs about 20 comparisons, where linear search may need a million.
- It requires sorted input. If you search only once on unsorted data, a linear scan is cheaper than sorting first.
- It is the foundation of "binary search on the answer" problems, where the array is implicit and you search a monotonic yes/no condition.
- Compared with a hash table it is slower for exact lookups (O(log n) vs O(1)), but it also answers range and nearest-value questions and needs no extra memory.

## Common pitfalls

- Computing \`mid = (lo + hi) / 2\` can overflow in languages with fixed-size integers. \`lo + (hi - lo) / 2\` is safe.
- Using \`lo < hi\` instead of \`lo <= hi\` misses the case where one element is left.
- Setting \`lo = mid\` or \`hi = mid\` in this version (instead of \`mid + 1\` / \`mid - 1\`) can loop forever.
- Running it on an unsorted array silently returns wrong answers.
- With duplicates, this version returns *some* matching index, not necessarily the first. Use a lower-bound search for that.

## What to watch in the visualizer

- Follow the three pointers \`lo\`, \`mid\` and \`hi\` on the bars. \`lo\` and \`hi\` close in on each other.
- Bars outside \`lo..hi\` are the ones already ruled out. The range should shrink by about half every loop.
- The comparison \`nums[mid]\` vs \`target\` decides which pointer moves. Watch only one of \`lo\` or \`hi\` change per iteration.
- Try the case where the target is missing: \`lo\` ends up greater than \`hi\` and the loop exits with \`-1\`.

## Example

\`\`\`
Input: nums = [2, 5, 8, 12, 16, 23, 38, 56], target = 38
Output: 6
\`\`\`
`;

export function buildBinarySearch(): QuestionInput {
  return {
    slug: "binary-search",
    title: "Binary Search",
    difficulty: "Easy",
    tags: ["searching", "array", "divide-and-conquer"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "binarySearch", args: [[2, 5, 8, 12, 16, 23, 38, 56], 38], expected: 6 },
      { method: "binarySearch", args: [[2, 5, 8, 12, 16, 23, 38, 56], 5], expected: 1 },
      { method: "binarySearch", args: [[2, 5, 8, 12, 16, 23, 38, 56], 7], expected: -1 },
      { method: "binarySearch", args: [[9], 9], expected: 0 },
    ],
    visualHints: { nums: "bars" },
  };
}
