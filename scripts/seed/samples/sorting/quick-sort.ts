import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Solution {
  quickSort(nums) {
    this.sortRange(nums, 0, nums.length - 1);
    return nums;
  }

  // Sorts nums[low..high] in place.
  sortRange(nums, low, high) {
    if (low >= high) {
      return; // zero or one element
    }
    const p = this.partition(nums, low, high); // pivot lands at index p
    this.sortRange(nums, low, p - 1); // everything smaller than the pivot
    this.sortRange(nums, p + 1, high); // everything larger than the pivot
  }

  // Lomuto partition: uses nums[high] as the pivot and returns its final index.
  partition(nums, low, high) {
    const pivot = nums[high];
    let i = low - 1; // last index of the "<= pivot" region
    for (let j = low; j < high; j++) {
      if (nums[j] <= pivot) {
        i++;
        const temp = nums[i];
        nums[i] = nums[j];
        nums[j] = temp;
      }
    }
    // Put the pivot right after the "<= pivot" region.
    const temp = nums[i + 1];
    nums[i + 1] = nums[high];
    nums[high] = temp;
    return i + 1;
  }
}
`;

const DESCRIPTION = `Quick sort is a divide-and-conquer sorting algorithm. It picks a **pivot**, rearranges the array so that smaller values are on its left and larger values on its right (the pivot is then in its final place), and recursively sorts the two sides. It sorts in place and is usually the fastest comparison sort in practice.

## Intuition

To sort a crowd by height, pick one person as a reference. Ask everyone shorter to stand to the left and everyone taller to the right. The reference person is now exactly where they belong, and the two groups can be sorted independently, with no merging needed afterwards.

The invariant of the partition step: **\`nums[low..i]\` holds values \`<= pivot\`, \`nums[i+1..j-1]\` holds values \`> pivot\`, and \`nums[j..high-1]\` is not yet examined.**

## How it works

1. \`sortRange(low, high)\`: if \`low >= high\`, return.
2. \`partition\` picks \`pivot = nums[high]\` (Lomuto scheme) and sets \`i = low - 1\`.
3. For \`j = low .. high - 1\`, if \`nums[j] <= pivot\`, increment \`i\` and swap \`nums[i]\` with \`nums[j]\`.
4. Finally swap the pivot into \`nums[i + 1]\`. That index \`p\` is the pivot's final position.
5. Recursively sort \`low..p - 1\` and \`p + 1..high\`.

**The other scheme.** Hoare partition uses two pointers that start at both ends and move towards each other, swapping pairs that are on the wrong side. It does fewer swaps than Lomuto and handles many equal values better, but its boundary conditions are trickier. Lomuto is used here because \`i\` and \`j\` are easier to follow.

## Walkthrough

Test case 0: \`nums = [7, 2, 9, 4, 6, 1, 5]\`.

| Range | Pivot | Result of the partition | Pivot index |
|-------|-------|-------------------------|-------------|
| \`[0..6]\` | 5 | \`[2, 4, 1, 5, 6, 9, 7]\` | 3 |
| \`[0..2]\` | 1 | \`[1, 4, 2, 5, 6, 9, 7]\` | 0 |
| \`[1..2]\` | 2 | \`[1, 2, 4, 5, 6, 9, 7]\` | 1 |
| \`[4..6]\` | 7 | \`[1, 2, 4, 5, 6, 7, 9]\` | 5 |

After the first partition, 5 is fixed at index 3 with \`2, 4, 1\` on its left and \`6, 9, 7\` on its right. The remaining ranges of length one (or zero) return immediately.

## Complexity

| Case | Time | Why |
|------|------|-----|
| Best | O(n log n) | each pivot splits the range roughly in half |
| Average | O(n log n) | random-looking data gives balanced-enough splits |
| Worst | O(n^2) | the pivot is always the min or max (for example a sorted array with the last element as pivot) |
| Space | O(log n) | recursion stack when balanced; O(n) in the worst case |

## When to use it

- A great general-purpose choice for arrays in memory: in place, cache friendly and very fast on average.
- It is **not stable**, and the worst case is quadratic. Choosing the pivot at random or as a median of three avoids the bad cases.
- Compared with merge sort: quick sort uses no extra array, but has no worst-case guarantee and is unstable.
- Related: quickselect uses the same partition to find the k-th smallest value in O(n) on average.

## Common pitfalls

- Taking the last element as the pivot on already sorted input gives O(n^2) time and deep recursion.
- Recursing on \`p\` instead of \`p - 1\` / \`p + 1\` never shrinks the range and loops forever.
- Forgetting the final swap that moves the pivot into place.
- Using \`<\` instead of \`<=\` in Lomuto still works, but with many duplicates the partitions become very unbalanced.

## What to watch in the visualizer

- In \`partition\`, the highlighted bar \`nums[high]\` is the pivot. \`j\` scans left to right, while \`i\` marks the end of the "small" region.
- Every swap happens between \`i\` and \`j\`; the pivot only moves in the last swap.
- Watch the call stack: the left side is sorted completely before the right side starts.
- After each partition the pivot bar is in its final position and never moves again.

## Example

\`\`\`
Input: nums = [7, 2, 9, 4, 6, 1, 5]
Output: [1, 2, 4, 5, 6, 7, 9]
\`\`\`
`;

export function buildQuickSort(): QuestionInput {
  return {
    slug: "quick-sort",
    title: "Quick Sort",
    difficulty: "Medium",
    tags: ["sorting", "divide-and-conquer", "recursion", "in-place"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "quickSort", args: [[7, 2, 9, 4, 6, 1, 5]], expected: [1, 2, 4, 5, 6, 7, 9] },
      { method: "quickSort", args: [[3, 3, 1, 2]], expected: [1, 2, 3, 3] },
      { method: "quickSort", args: [[2, 1]], expected: [1, 2] },
    ],
    visualHints: { nums: "bars" },
  };
}
