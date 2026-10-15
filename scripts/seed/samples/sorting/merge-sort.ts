import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Solution {
  mergeSort(nums) {
    this.sortRange(nums, 0, nums.length - 1);
    return nums;
  }

  // Sorts nums[lo..hi] by splitting it in two halves.
  sortRange(nums, lo, hi) {
    if (lo >= hi) {
      return; // zero or one element is already sorted
    }
    const mid = lo + Math.floor((hi - lo) / 2);
    this.sortRange(nums, lo, mid); // sort the left half
    this.sortRange(nums, mid + 1, hi); // sort the right half
    this.merge(nums, lo, mid, hi); // combine the two sorted halves
  }

  // Merges the sorted runs nums[lo..mid] and nums[mid+1..hi].
  merge(nums, lo, mid, hi) {
    const left = nums.slice(lo, mid + 1);
    const right = nums.slice(mid + 1, hi + 1);
    let i = 0; // next unused element of left
    let j = 0; // next unused element of right
    let k = lo; // next slot to fill in nums
    while (i < left.length && j < right.length) {
      if (left[i] <= right[j]) {
        nums[k] = left[i];
        i++;
      } else {
        nums[k] = right[j];
        j++;
      }
      k++;
    }
    // One side is used up; copy what is left of the other side.
    while (i < left.length) {
      nums[k] = left[i];
      i++;
      k++;
    }
    while (j < right.length) {
      nums[k] = right[j];
      j++;
      k++;
    }
  }
}
`;

const DESCRIPTION = `Merge sort is a divide-and-conquer sorting algorithm: it splits the array in half, sorts each half recursively, and then merges the two sorted halves into one sorted array. It sorts in O(n log n) time in every case and is stable.

## Intuition

Merging two sorted lists is easy and fast: look at the front of each list, take the smaller one, repeat. Sorting a long list is hard, but sorting a list of one element is trivial. So keep halving until each piece has a single element, then merge pieces back together on the way up. Each merge only has to walk through its two inputs once.

The invariant: **after \`sortRange(nums, lo, hi)\` returns, \`nums[lo..hi]\` is sorted.** The merge step relies on both halves being sorted already, which the recursive calls guarantee.

## How it works

1. \`sortRange(lo, hi)\`: if \`lo >= hi\`, there is at most one element, so return.
2. Compute \`mid\` and recursively sort \`lo..mid\` and \`mid + 1..hi\`.
3. Call \`merge(lo, mid, hi)\`.
4. \`merge\` copies the two halves into \`left\` and \`right\`.
5. Keep three pointers: \`i\` in \`left\`, \`j\` in \`right\`, and \`k\` in \`nums\` (the next slot to fill).
6. While both halves have elements, copy the smaller front value into \`nums[k]\` and advance its pointer and \`k\`. Using \`<=\` on ties takes the left value first, which keeps the sort stable.
7. Copy whatever remains of \`left\` or \`right\`.

## Walkthrough

Test case 0: \`nums = [6, 3, 8, 2, 9, 1]\`. The recursion splits \`[0..5]\` into \`[0..2]\` and \`[3..5]\`, and so on:

| Merge | left | right | \`nums\` afterwards |
|-------|------|-------|-------------------|
| \`[0..1]\` | \`[6]\` | \`[3]\` | \`[3, 6, 8, 2, 9, 1]\` |
| \`[0..2]\` | \`[3, 6]\` | \`[8]\` | \`[3, 6, 8, 2, 9, 1]\` |
| \`[3..4]\` | \`[2]\` | \`[9]\` | \`[3, 6, 8, 2, 9, 1]\` |
| \`[3..5]\` | \`[2, 9]\` | \`[1]\` | \`[3, 6, 8, 1, 2, 9]\` |
| \`[0..5]\` | \`[3, 6, 8]\` | \`[1, 2, 9]\` | \`[1, 2, 3, 6, 8, 9]\` |

In the last merge, \`i\`, \`j\` and \`k\` advance as follows: take 1 (right), take 2 (right), take 3 (left), take 6 (left), take 8 (left); then \`left\` is empty and the rest of \`right\` (\`9\`) is copied.

## Complexity

| Case | Time | Why |
|------|------|-----|
| Best | O(n log n) | still splits and merges every level |
| Average | O(n log n) | log n levels of recursion, each merging n elements in total |
| Worst | O(n log n) | same, the input order does not matter |
| Space | O(n) | the temporary \`left\` and \`right\` copies, plus O(log n) recursion stack |

## When to use it

- When you need guaranteed O(n log n) time or a **stable** sort. It is the basis of stable library sorts and of external sorting (data too big for memory), because merging reads sequentially.
- It is excellent for linked lists, where merging needs no extra array.
- Compared with quick sort: merge sort has a better worst case and is stable, but needs O(n) extra memory and is usually a bit slower on arrays because of the copying.
- Compared with insertion sort: much faster on large inputs, slower on tiny ones, so hybrid sorts switch to insertion sort for small pieces.

## Common pitfalls

- Using \`<\` instead of \`<=\` when comparing \`left[i]\` and \`right[j]\` makes the sort unstable.
- Forgetting to copy the leftovers after the main loop loses elements.
- Off-by-one in the halves: with \`mid\` as the end of the left half, the right half must start at \`mid + 1\`, and \`slice\` excludes its end index.
- Computing \`mid\` as \`(lo + hi) / 2\` without flooring gives a fractional index.
- Recursing with \`lo > hi\` instead of stopping at \`lo >= hi\` can recurse forever.

## What to watch in the visualizer

- The call stack shows the recursion going deep to the left first, then merging back up.
- Inside \`merge\`, the two small arrays \`left\` and \`right\` are the halves; \`i\` and \`j\` point at their fronts and \`k\` points at the slot being written in \`nums\`.
- \`k\` always moves forward by one per write, and exactly one of \`i\` or \`j\` advances with it.
- The first merge (\`[6]\` and \`[3]\`) already changes the array to \`[3, 6, 8, 2, 9, 1]\`; the last merge shows the biggest rearrangement, filling \`nums\` from the two sorted halves.

## Example

\`\`\`
Input: nums = [6, 3, 8, 2, 9, 1]
Output: [1, 2, 3, 6, 8, 9]
\`\`\`
`;

export function buildMergeSort(): QuestionInput {
  return {
    slug: "merge-sort",
    title: "Merge Sort",
    difficulty: "Medium",
    tags: ["sorting", "divide-and-conquer", "recursion", "stable"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "mergeSort", args: [[6, 3, 8, 2, 9, 1]], expected: [1, 2, 3, 6, 8, 9] },
      { method: "mergeSort", args: [[4, 4, 2, 7, 1]], expected: [1, 2, 4, 4, 7] },
      { method: "mergeSort", args: [[1]], expected: [1] },
    ],
    visualHints: { nums: "bars", left: "bars", right: "bars" },
  };
}
