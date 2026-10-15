import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Solution {
  linearSearch(nums, target) {
    // Look at every position from left to right.
    for (let i = 0; i < nums.length; i++) {
      if (nums[i] === target) {
        return i; // found: report the index
      }
    }
    return -1; // checked everything, not present
  }
}
`;

const DESCRIPTION = `Linear search finds a target value in an array by checking the elements one at a time, from the first to the last. It returns the index of the first match, or \`-1\` when the value is not there. It needs no preparation of the data, so it works on any array, sorted or not.

## Intuition

Think of looking for a name on a printed list by running your finger down it. You do not need the list to be in any order: you just keep going until you see the name or run out of lines. The algorithm is exactly that. The invariant is simple: **before looking at index \`i\`, we know the target is not in \`nums[0..i-1]\`**. When the loop ends without a hit, that fact covers the whole array.

## How it works

1. Start with the index \`i = 0\`.
2. Compare \`nums[i]\` with \`target\`.
3. If they are equal, return \`i\` immediately.
4. Otherwise move on to \`i + 1\`.
5. If \`i\` runs past the last element, return \`-1\`.

## Walkthrough

Test case 0: \`nums = [7, 3, 9, 4, 1, 8]\`, \`target = 4\`.

| Step | i | nums[i] | Equal to 4? | Action |
|------|---|---------|-------------|--------|
| 1 | 0 | 7 | no | move on |
| 2 | 1 | 3 | no | move on |
| 3 | 2 | 9 | no | move on |
| 4 | 3 | 4 | yes | return \`3\` |

The elements \`1\` and \`8\` are never examined, because the search stops at the first match.

## Complexity

| Case | Time | Why |
|------|------|-----|
| Best | O(1) | the target is the first element |
| Average | O(n) | about half of the array is scanned |
| Worst | O(n) | the target is last or missing, so every element is checked |
| Space | O(1) | only the index \`i\` is stored |

## When to use it

- Great for small arrays, for data that is unsorted, and for one-off lookups where sorting first would cost more than the search.
- It works on structures that have no random access, such as linked lists.
- For a **sorted** array, binary search does the same job in O(log n). For many repeated lookups on the same data, build a hash set or hash map once and get O(1) lookups.

## Common pitfalls

- Using \`<=\` in the loop condition reads \`nums[nums.length]\`, which is \`undefined\`.
- Returning \`false\`, \`null\` or \`0\` for "not found". \`0\` is a valid index, so \`-1\` is the usual sentinel.
- Using \`==\` instead of \`===\` can match values of different types (for example \`"4"\` and \`4\`).
- Forgetting that only the **first** match is returned. If you need every match, keep looping and collect the indices.

## What to watch in the visualizer

- The array is drawn as bars. Follow the pointer \`i\` as it moves one bar to the right per step.
- The comparison \`nums[i] === target\` is the only work per step. Watch the \`target\` variable stay constant while \`i\` changes.
- On a hit the function returns right away, so the pointer stops before the end of the array.
- Switch to the second test case to see a miss: \`i\` walks to the end and the result is \`-1\`.

## Example

\`\`\`
Input: nums = [7, 3, 9, 4, 1, 8], target = 4
Output: 3
\`\`\`
`;

export function buildLinearSearch(): QuestionInput {
  return {
    slug: "linear-search",
    title: "Linear Search",
    difficulty: "Easy",
    tags: ["searching", "array", "brute-force"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "linearSearch", args: [[7, 3, 9, 4, 1, 8], 4], expected: 3 },
      { method: "linearSearch", args: [[5, 2, 8], 10], expected: -1 },
      { method: "linearSearch", args: [[6], 6], expected: 0 },
    ],
    visualHints: { nums: "bars" },
  };
}
