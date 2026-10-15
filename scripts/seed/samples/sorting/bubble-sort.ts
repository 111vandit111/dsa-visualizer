import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Solution {
  bubbleSort(nums) {
    const n = nums.length;
    for (let pass = 0; pass < n - 1; pass++) {
      let swapped = false;
      // After each pass the largest unsorted value has "bubbled" to the end,
      // so the inner loop can stop one position earlier every time.
      for (let j = 0; j < n - 1 - pass; j++) {
        if (nums[j] > nums[j + 1]) {
          const temp = nums[j];
          nums[j] = nums[j + 1];
          nums[j + 1] = temp;
          swapped = true;
        }
      }
      if (!swapped) {
        break; // no swaps means the array is already sorted
      }
    }
    return nums;
  }
}
`;

const DESCRIPTION = `Bubble sort orders an array by repeatedly comparing neighbouring elements and swapping them when they are in the wrong order. After each pass over the array, the largest remaining value has "bubbled up" to its final position at the right end. This version stops early when a whole pass makes no swap.

## Intuition

Imagine bubbles rising in a glass of soda: big bubbles rise past small ones. Here the big numbers rise to the right. Each comparison only fixes one pair, but a large value keeps being swapped forward until it meets something larger, so one pass is enough to put the maximum of the unsorted part at the end.

The invariant: **after pass \`p\`, the last \`p + 1\` elements are in their final sorted positions.** That is why the inner loop can shrink by one each pass. If a pass swaps nothing, every neighbouring pair is already in order, so the array is sorted and we can stop.

## How it works

1. Repeat for \`pass = 0 .. n - 2\`.
2. Set \`swapped = false\`.
3. For \`j = 0 .. n - 2 - pass\`, compare \`nums[j]\` and \`nums[j + 1]\`.
4. If \`nums[j] > nums[j + 1]\`, swap them and set \`swapped = true\`.
5. After the inner loop, if \`swapped\` is still \`false\`, break: the array is sorted.
6. Return the array.

## Walkthrough

Test case 0: \`nums = [5, 2, 9, 1, 7, 3]\`.

| Pass | Swaps made | Array after the pass | Note |
|------|-----------|----------------------|------|
| 0 | 4 | \`[2, 5, 1, 7, 3, 9]\` | 9 bubbled to the end |
| 1 | 2 | \`[2, 1, 5, 3, 7, 9]\` | 7 is now in place |
| 2 | 2 | \`[1, 2, 3, 5, 7, 9]\` | already sorted, but a swap happened |
| 3 | 0 | \`[1, 2, 3, 5, 7, 9]\` | \`swapped\` is false, so we break |

Pass 3 is the early exit: one extra pass with no swaps proves the array is sorted, so the loop never starts a fifth pass.

## Complexity

| Case | Time | Why |
|------|------|-----|
| Best | O(n) | already sorted: one pass, no swaps, early exit |
| Average | O(n^2) | about n^2 / 4 swaps and n^2 / 2 comparisons |
| Worst | O(n^2) | reverse order needs a swap for every pair |
| Space | O(1) | sorts in place with one temporary variable |

## When to use it

- It is mostly a teaching algorithm: very easy to write and to reason about, and it is **stable** (equal values keep their order) and in place.
- With the \`swapped\` flag it is fast on nearly sorted data, but insertion sort does the same job with fewer writes.
- For real workloads prefer merge sort, quick sort or the built-in sort. For small arrays, insertion sort is better than bubble sort.

## Common pitfalls

- Looping the inner loop to \`n - 1\` reads \`nums[n]\`, which is \`undefined\`, so comparisons go wrong.
- Forgetting the \`swapped\` flag keeps the worst-case behaviour even for sorted input.
- Using \`>=\` instead of \`>\` swaps equal elements and makes the sort unstable.
- Resetting \`swapped\` outside the outer loop makes the early exit never trigger (or trigger too soon).

## What to watch in the visualizer

- The pointer \`j\` sweeps left to right; the two bars at \`j\` and \`j + 1\` are the pair being compared.
- When a swap happens, the two bars exchange places and \`swapped\` turns \`true\`.
- After each pass the rightmost unsorted bar is the maximum: the sorted tail grows from the right.
- The final pass shows \`swapped\` staying \`false\`, then the loop breaks.

## Example

\`\`\`
Input: nums = [5, 2, 9, 1, 7, 3]
Output: [1, 2, 3, 5, 7, 9]
\`\`\`
`;

export function buildBubbleSort(): QuestionInput {
  return {
    slug: "bubble-sort",
    title: "Bubble Sort",
    difficulty: "Easy",
    tags: ["sorting", "comparison-sort", "stable"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "bubbleSort", args: [[5, 2, 9, 1, 7, 3]], expected: [1, 2, 3, 5, 7, 9] },
      { method: "bubbleSort", args: [[1, 2, 3, 4]], expected: [1, 2, 3, 4] },
      { method: "bubbleSort", args: [[4, 3, 2, 1]], expected: [1, 2, 3, 4] },
    ],
    visualHints: { nums: "bars" },
  };
}
