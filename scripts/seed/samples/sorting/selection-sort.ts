import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Solution {
  selectionSort(nums) {
    const n = nums.length;
    for (let i = 0; i < n - 1; i++) {
      // Find the smallest value in the unsorted part nums[i..n-1].
      let minIndex = i;
      for (let j = i + 1; j < n; j++) {
        if (nums[j] < nums[minIndex]) {
          minIndex = j;
        }
      }
      // Put it at the front of the unsorted part.
      if (minIndex !== i) {
        const temp = nums[i];
        nums[i] = nums[minIndex];
        nums[minIndex] = temp;
      }
    }
    return nums;
  }
}
`;

const DESCRIPTION = `Selection sort builds the sorted array from left to right. In each round it scans the unsorted part to find the smallest element and swaps it into the first unsorted position. It always makes at most \`n - 1\` swaps, which is the fewest of the simple sorts.

## Intuition

It is how many people sort a hand of cards laid out on a table: look through all the cards, pick the lowest, put it first; then look through the remaining cards and pick the lowest again. The sorted prefix only grows, and every element in it is already in its final place.

The invariant: **\`nums[0..i-1]\` holds the \`i\` smallest values in sorted order.** The remaining work is to choose the next smallest, which must be the minimum of \`nums[i..n-1]\`.

## How it works

1. For \`i = 0 .. n - 2\`, treat \`nums[i..]\` as the unsorted part.
2. Assume the minimum is at \`minIndex = i\`.
3. Scan \`j = i + 1 .. n - 1\`; whenever \`nums[j] < nums[minIndex]\`, set \`minIndex = j\`.
4. If \`minIndex\` is not \`i\`, swap \`nums[i]\` and \`nums[minIndex]\`.
5. After the last round the array is sorted. Return it.

## Walkthrough

Test case 0: \`nums = [64, 25, 12, 22, 11, 90, 3]\`.

| i | Minimum found (index, value) | Array after the swap |
|---|------------------------------|----------------------|
| 0 | (6, 3) | \`[3, 25, 12, 22, 11, 90, 64]\` |
| 1 | (4, 11) | \`[3, 11, 12, 22, 25, 90, 64]\` |
| 2 | (2, 12) | unchanged: already in place |
| 3 | (3, 22) | unchanged |
| 4 | (4, 25) | unchanged |
| 5 | (6, 64) | \`[3, 11, 12, 22, 25, 64, 90]\` |

Only three swaps were needed for seven elements, but all six scans still ran in full.

## Complexity

| Case | Time | Why |
|------|------|-----|
| Best | O(n^2) | the scan for the minimum always visits the whole unsorted part |
| Average | O(n^2) | n(n-1)/2 comparisons regardless of the input order |
| Worst | O(n^2) | same number of comparisons; at most n - 1 swaps |
| Space | O(1) | in place, one extra variable |

## When to use it

- Use it when writes are expensive (flash memory, large records) because it does at most \`n - 1\` swaps.
- It does not adapt: sorted input costs as much as random input, unlike bubble or insertion sort.
- The simple swap version is **not stable**: swapping can jump an element over an equal one.
- For anything but tiny arrays prefer merge sort, quick sort or heap sort. Heap sort is selection sort that finds the maximum with a heap instead of a scan.

## Common pitfalls

- Resetting \`minIndex\` to \`0\` instead of \`i\` re-selects already sorted elements.
- Starting the inner loop at \`i\` instead of \`i + 1\` works but wastes a comparison.
- Swapping \`nums[i]\` with \`nums[j]\` inside the scan (instead of remembering \`minIndex\`) does many extra swaps and can break the logic.
- Assuming it is stable: \`[3a, 3b, 1]\` becomes \`[1, 3b, 3a]\`.

## What to watch in the visualizer

- \`i\` marks the start of the unsorted part; everything left of it is final.
- \`j\` scans to the right while \`minIndex\` stays on the best candidate so far; it jumps whenever a smaller bar is found.
- At the end of each round exactly one swap (or none) happens between \`i\` and \`minIndex\`.
- Notice that rounds 2 to 4 here swap nothing, because the right value was already in place.

## Example

\`\`\`
Input: nums = [64, 25, 12, 22, 11, 90, 3]
Output: [3, 11, 12, 22, 25, 64, 90]
\`\`\`
`;

export function buildSelectionSort(): QuestionInput {
  return {
    slug: "selection-sort",
    title: "Selection Sort",
    difficulty: "Easy",
    tags: ["sorting", "comparison-sort", "in-place"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "selectionSort", args: [[64, 25, 12, 22, 11, 90, 3]], expected: [3, 11, 12, 22, 25, 64, 90] },
      { method: "selectionSort", args: [[2, 1]], expected: [1, 2] },
      { method: "selectionSort", args: [[5, 5, 1]], expected: [1, 5, 5] },
    ],
    visualHints: { nums: "bars" },
  };
}
