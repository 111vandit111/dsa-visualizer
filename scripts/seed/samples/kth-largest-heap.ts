import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Solution {
  findKthLargest(nums, k) {
    const heap = [];
    const swap = (a, b) => {
      const tmp = heap[a];
      heap[a] = heap[b];
      heap[b] = tmp;
    };
    const siftUp = (i) => {
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (heap[parent] <= heap[i]) break;
        swap(parent, i);
        i = parent;
      }
    };
    const siftDown = (i) => {
      while (true) {
        let smallest = i;
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        if (l < heap.length && heap[l] < heap[smallest]) smallest = l;
        if (r < heap.length && heap[r] < heap[smallest]) smallest = r;
        if (smallest === i) break;
        swap(smallest, i);
        i = smallest;
      }
    };
    for (const num of nums) {
      heap.push(num);
      siftUp(heap.length - 1);
      if (heap.length > k) {
        heap[0] = heap.pop();
        siftDown(0);
      }
    }
    return heap[0];
  }
}
`;

const DESCRIPTION = `Given an integer array \`nums\` and an integer \`k\`, return the \`k\`-th largest element in the array.

Keep a min-heap of the \`k\` largest values seen so far: its root is the answer.

## Example

\`\`\`
Input: nums = [3, 2, 1, 5, 6, 4], k = 2
Output: 5
\`\`\`

## Constraints

- \`1 <= k <= nums.length <= 10^5\`
- \`-10^4 <= nums[i] <= 10^4\`
`;

export function buildKthLargestHeap(): QuestionInput {
  return {
    slug: "kth-largest-heap",
    title: "Kth Largest Element in an Array",
    difficulty: "Medium",
    tags: ["array", "heap", "priority-queue"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "findKthLargest", args: [[3, 2, 1, 5, 6, 4], 2], expected: 5 },
      { method: "findKthLargest", args: [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], expected: 4 },
      { method: "findKthLargest", args: [[7], 1], expected: 7 },
    ],
    visualHints: {},
  };
}
