import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Solution {
  heapSort(nums) {
    const n = nums.length;
    // Phase 1: turn the array into a max-heap, starting at the last parent.
    for (let start = Math.floor(n / 2) - 1; start >= 0; start--) {
      this.siftDown(nums, start, n);
    }
    // Phase 2: repeatedly move the maximum to the end and repair the heap.
    for (let end = n - 1; end > 0; end--) {
      const temp = nums[0];
      nums[0] = nums[end];
      nums[end] = temp;
      this.siftDown(nums, 0, end); // the heap is now nums[0..end-1]
    }
    return nums;
  }

  // Pushes heap[root] down until both of its children are not larger.
  siftDown(heap, root, size) {
    let parent = root;
    while (true) {
      const leftChild = 2 * parent + 1;
      const rightChild = leftChild + 1;
      let largest = parent;
      if (leftChild < size && heap[leftChild] > heap[largest]) {
        largest = leftChild;
      }
      if (rightChild < size && heap[rightChild] > heap[largest]) {
        largest = rightChild;
      }
      if (largest === parent) {
        return; // heap property holds here
      }
      const temp = heap[parent];
      heap[parent] = heap[largest];
      heap[largest] = temp;
      parent = largest;
    }
  }
}
`;

const DESCRIPTION = `Heap sort sorts an array in place using a binary **max-heap**. It first rearranges the array into a max-heap, then repeatedly swaps the largest element (the root) to the end of the array and shrinks the heap. Because it is built on a heap (a complete binary tree stored in an array), it also appears under **Tree Applications**.

## Intuition

A max-heap is a binary tree where every parent is at least as large as its children, so the biggest value is always at the root. Stored in an array, the children of index \`p\` are at \`2p + 1\` and \`2p + 2\`, so no pointers are needed.

Selection sort repeatedly finds the maximum with a slow scan; heap sort finds it instantly at \`nums[0]\` and then repairs the heap in O(log n). The invariant: **during phase 2, \`nums[0..end]\` is a max-heap and \`nums[end+1..n-1]\` holds the largest values in sorted order.**

## How it works

1. **Build the heap.** For \`start\` from the last parent (\`floor(n / 2) - 1\`) down to \`0\`, call \`siftDown(start)\`. Leaves are already valid one-element heaps.
2. **Sort.** For \`end\` from \`n - 1\` down to \`1\`: swap \`nums[0]\` (the max) with \`nums[end]\`, then call \`siftDown(0)\` on the smaller heap \`nums[0..end-1]\`.
3. \`siftDown(root, size)\`: compare the node with its \`leftChild\` and \`rightChild\` (only those inside \`size\`), pick the \`largest\`; if it is a child, swap and continue from there; otherwise stop.

## Walkthrough

Test case 0: \`nums = [4, 10, 3, 5, 1, 8]\`, which as a tree is \`4\` with children \`10, 3\`; \`10\` has children \`5, 1\`; \`3\` has child \`8\`.

| Step | Action | Array |
|------|--------|-------|
| build \`start = 2\` | 3 vs child 8: swap | \`[4, 10, 8, 5, 1, 3]\` |
| build \`start = 1\` | 10 is larger than 5 and 1: no change | \`[4, 10, 8, 5, 1, 3]\` |
| build \`start = 0\` | 4 sinks below 10, then below 5 | \`[10, 5, 8, 4, 1, 3]\` |
| \`end = 5\` | swap 10 to the end, repair | \`[8, 5, 3, 4, 1, 10]\` |
| \`end = 4\` | swap 8 to index 4, repair | \`[5, 4, 3, 1, 8, 10]\` |
| \`end = 3\` | swap 5 to index 3, repair | \`[4, 1, 3, 5, 8, 10]\` |
| \`end = 2\` | swap 4 to index 2, repair | \`[3, 1, 4, 5, 8, 10]\` |
| \`end = 1\` | swap 3 to index 1, repair | \`[1, 3, 4, 5, 8, 10]\` |

## Complexity

| Case | Time | Why |
|------|------|-----|
| Best | O(n log n) | the sort phase still does n sift-downs (O(n) if all values are equal) |
| Average | O(n log n) | building the heap costs O(n), then n sift-downs cost O(log n) each |
| Worst | O(n log n) | no bad input exists, unlike quick sort |
| Space | O(1) | in place; the heap lives inside the input array |

## When to use it

- When you need a guaranteed O(n log n) worst case **and** O(1) extra memory, which merge sort (O(n) space) and quick sort (O(n^2) worst case) cannot both offer.
- It is **not stable**, and it jumps around memory, so it is usually slower than quick sort on real hardware.
- The same heap idea gives a priority queue and "top k" algorithms. Building a heap in O(n) is cheaper than n inserts at O(n log n).

## Common pitfalls

- Starting the build loop at \`n - 1\` instead of \`floor(n / 2) - 1\` wastes work on leaves (still correct, but slower).
- Forgetting the \`size\` limit in \`siftDown\` lets it pull already sorted elements back into the heap.
- Checking \`rightChild < size\` against \`nums.length\` instead of the shrinking heap size.
- Using a min-heap gives a descending order. A max-heap is needed for ascending output.
- Off-by-one on the child indices: with a zero-based array, children are \`2p + 1\` and \`2p + 2\`.

## What to watch in the visualizer

- The array is drawn as a heap: a tree on top and its backing array below. Parent and child links show the structure.
- In \`siftDown\`, follow \`parent\`, \`leftChild\` and \`rightChild\`; the value sinks down the tree one level per loop.
- During phase 2 the view still draws all \`n\` elements: the sorted suffix is the part of the array after the index \`end\`, and it grows by one each round while the live heap is \`nums[0..end-1]\`. Use the array/bars toggle to see the sorted suffix as growing bars.
- Phase 1 runs from the lowest parent upwards, so the biggest value reaches the root at the end of the build.

## Example

\`\`\`
Input: nums = [4, 10, 3, 5, 1, 8]
Output: [1, 3, 4, 5, 8, 10]
\`\`\`
`;

export function buildHeapSort(): QuestionInput {
  return {
    slug: "heap-sort",
    title: "Heap Sort",
    difficulty: "Medium",
    tags: ["sorting", "heap", "tree", "in-place"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "heapSort", args: [[4, 10, 3, 5, 1, 8]], expected: [1, 3, 4, 5, 8, 10] },
      { method: "heapSort", args: [[2, 2, 1]], expected: [1, 2, 2] },
      { method: "heapSort", args: [[9, 8, 7, 6, 5]], expected: [5, 6, 7, 8, 9] },
    ],
    visualHints: { nums: "heap" },
  };
}
