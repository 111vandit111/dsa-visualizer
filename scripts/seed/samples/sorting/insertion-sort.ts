import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Solution {
  insertionSort(nums) {
    const n = nums.length;
    // nums[0..i-1] is always sorted; insert nums[i] into it.
    for (let i = 1; i < n; i++) {
      const key = nums[i];
      let j = i - 1;
      // Shift larger values one step to the right to open a gap.
      while (j >= 0 && nums[j] > key) {
        nums[j + 1] = nums[j];
        j--;
      }
      nums[j + 1] = key; // drop the key into the gap
    }
    return nums;
  }
}
`;

const DESCRIPTION = `Insertion sort grows a sorted prefix one element at a time. It takes the next element, slides it left past every larger value, and drops it into the gap. It is simple, stable, in place, and very fast on arrays that are already nearly sorted.

## Intuition

This is how you sort playing cards in your hand: pick up a new card and slide it into the right spot among the cards you already hold, which are kept in order. You never need to look at cards you have not picked up yet.

The invariant: **before iteration \`i\`, \`nums[0..i-1]\` contains the original first \`i\` elements in sorted order.** Inserting \`nums[i]\` into that sorted block keeps the invariant true for \`i + 1\`.

## How it works

1. Start with \`i = 1\` (a single element is already sorted).
2. Save \`key = nums[i]\` and set \`j = i - 1\`.
3. While \`j >= 0\` and \`nums[j] > key\`, copy \`nums[j]\` one slot right (\`nums[j + 1] = nums[j]\`) and decrement \`j\`.
4. Write \`key\` into \`nums[j + 1]\`.
5. Move to the next \`i\`. After \`i = n - 1\` the array is sorted.

## Walkthrough

Test case 0: \`nums = [6, 3, 8, 2, 9, 1]\`.

| i | key | Shifts | Array after inserting |
|---|-----|--------|-----------------------|
| 1 | 3 | 6 moves right | \`[3, 6, 8, 2, 9, 1]\` |
| 2 | 8 | none | \`[3, 6, 8, 2, 9, 1]\` |
| 3 | 2 | 8, 6, 3 move right | \`[2, 3, 6, 8, 9, 1]\` |
| 4 | 9 | none | \`[2, 3, 6, 8, 9, 1]\` |
| 5 | 1 | 9, 8, 6, 3, 2 move right | \`[1, 2, 3, 6, 8, 9]\` |

When no shift is needed (\`i = 2\` and \`i = 4\`) the key is already larger than the last sorted element, so the inner loop does not run at all.

## Complexity

| Case | Time | Why |
|------|------|-----|
| Best | O(n) | sorted input: each key is compared once and nothing shifts |
| Average | O(n^2) | each key shifts past about half of the sorted prefix |
| Worst | O(n^2) | reverse order: key \`i\` shifts past all \`i\` earlier elements |
| Space | O(1) | in place, only \`key\` and \`j\` are stored |

## When to use it

- Best choice for small arrays (a few dozen elements) and for nearly sorted data; real library sorts (for example Timsort) use it for small runs.
- It is **stable** and **online**: it can sort items as they arrive.
- It moves elements with shifts instead of swaps, so it does fewer writes than bubble sort.
- For large random inputs, O(n^2) is too slow: use merge sort, quick sort or heap sort.

## Common pitfalls

- Forgetting to save \`key\` before shifting; the shift overwrites \`nums[i]\`.
- Writing the loop condition as \`nums[j] > key && j >= 0\`, which reads \`nums[-1]\` first. Check the bound before the value.
- Using \`>=\` instead of \`>\` makes the sort unstable.
- Writing the key to \`nums[j]\` instead of \`nums[j + 1]\`; after the loop \`j\` points at the element *before* the gap.

## What to watch in the visualizer

- \`i\` marks the next element to insert; the bars on its left form the sorted prefix.
- The variable \`key\` holds the value being inserted, and \`j\` walks left from \`i - 1\`.
- Each loop iteration copies one bar to the right, so a duplicate value is briefly visible. This is the "gap" being opened.
- The last assignment \`nums[j + 1] = key\` closes the gap.

## Example

\`\`\`
Input: nums = [6, 3, 8, 2, 9, 1]
Output: [1, 2, 3, 6, 8, 9]
\`\`\`
`;

export function buildInsertionSort(): QuestionInput {
  return {
    slug: "insertion-sort",
    title: "Insertion Sort",
    difficulty: "Easy",
    tags: ["sorting", "comparison-sort", "stable"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "insertionSort", args: [[6, 3, 8, 2, 9, 1]], expected: [1, 2, 3, 6, 8, 9] },
      { method: "insertionSort", args: [[1, 2, 3]], expected: [1, 2, 3] },
      { method: "insertionSort", args: [[3, 2, 1, 0]], expected: [0, 1, 2, 3] },
    ],
    visualHints: { nums: "bars" },
  };
}
