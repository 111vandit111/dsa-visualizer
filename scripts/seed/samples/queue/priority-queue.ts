import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class MinPriorityQueue {
  constructor() {
    this.heap = []; // binary min-heap stored level by level
  }

  // Insert: add at the end, then float up while smaller than the parent.
  insert(value) {
    this.heap.push(value);
    this.siftUp(this.heap.length - 1);
  }

  // Peek: the smallest value is always at the root.
  peekMin() {
    if (this.heap.length === 0) {
      return null;
    }
    return this.heap[0];
  }

  // Extract: take the root, move the last value to the root, and sink it.
  extractMin() {
    if (this.heap.length === 0) {
      return null;
    }
    const min = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.siftDown(0);
    }
    return min;
  }

  size() {
    return this.heap.length;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  siftUp(index) {
    let child = index;
    while (child > 0) {
      const parent = Math.floor((child - 1) / 2);
      if (this.heap[parent] <= this.heap[child]) {
        return; // heap property holds
      }
      const temp = this.heap[parent];
      this.heap[parent] = this.heap[child];
      this.heap[child] = temp;
      child = parent;
    }
  }

  siftDown(index) {
    let parent = index;
    const size = this.heap.length;
    while (true) {
      const leftChild = 2 * parent + 1;
      const rightChild = leftChild + 1;
      let smallest = parent;
      if (leftChild < size && this.heap[leftChild] < this.heap[smallest]) {
        smallest = leftChild;
      }
      if (rightChild < size && this.heap[rightChild] < this.heap[smallest]) {
        smallest = rightChild;
      }
      if (smallest === parent) {
        return; // heap property holds
      }
      const temp = this.heap[parent];
      this.heap[parent] = this.heap[smallest];
      this.heap[smallest] = temp;
      parent = smallest;
    }
  }
}
`;

const DESCRIPTION = `A priority queue is a queue where each element has a priority and the element with the **highest priority leaves first**, not the oldest. This one is a *min* priority queue (the smallest value goes first), implemented by hand as a **binary heap** stored in an array. Insert and extract both take O(log n); peeking at the minimum takes O(1).

## Intuition

A hospital emergency room: patients are served by urgency, not arrival order. Keeping a fully sorted list would make every insert O(n). A heap keeps just enough order: **every parent is smaller than or equal to its children.** Then the smallest element is always at the root, and repairing the heap after a change only walks one root-to-leaf path, which has O(log n) steps.

The heap is a complete binary tree packed in an array: the children of index \`p\` are \`2p + 1\` and \`2p + 2\`, and the parent of index \`c\` is \`floor((c - 1) / 2)\`.

## How it works

1. **insert (value)**: append the value at the end of the array, then \`siftUp\`: while it is smaller than its parent, swap with the parent and continue upward.
2. **peekMin**: return \`heap[0]\` (or \`null\` if empty).
3. **extractMin**: remember \`heap[0]\`; remove the last element and put it at the root; then \`siftDown\`: swap it with the smaller child until neither child is smaller. Return the remembered minimum.
4. **size / isEmpty**: use the array length.

## Walkthrough

Test case 0. The heap array after each operation:

| Operation | Heap array | Result |
|-----------|-----------|--------|
| \`insert(5)\` | \`[5]\` | - |
| \`insert(3)\` | \`[3, 5]\` (3 floats above 5) | - |
| \`insert(8)\` | \`[3, 5, 8]\` | - |
| \`insert(1)\` | \`[1, 3, 8, 5]\` (1 floats up two levels) | - |
| \`peekMin()\` | unchanged | 1 |
| \`extractMin()\` | \`[3, 5, 8]\` (5 moved to root, sank under 3) | 1 |
| \`extractMin()\` | \`[5, 8]\` (8 moved to root, then swapped below 5) | 3 |
| \`size()\` | \`[5, 8]\` | 2 |
| \`insert(2)\` | \`[2, 8, 5]\` (2 swaps with the root 5) | - |
| \`extractMin()\` | \`[5, 8]\` | 2 |
| \`extractMin()\` | \`[8]\` | 5 |
| \`extractMin()\` | \`[]\` | 8 |
| \`extractMin()\` | \`[]\` | null |
| \`isEmpty()\` | \`[]\` | true |

## Complexity

| Operation | Time | Why |
|-----------|------|-----|
| insert | O(log n) | siftUp climbs at most the height of the tree |
| extractMin | O(log n) | siftDown descends at most the height of the tree |
| peekMin, size, isEmpty | O(1) | read the root or the length |
| Space | O(n) | one array slot per element |

## When to use it

- Scheduling, Dijkstra's shortest paths, Prim's MST, merging k sorted lists, "k largest elements", event simulation and heap sort.
- Compared with a sorted array: inserts are O(log n) instead of O(n). Compared with an unsorted array: finding the minimum is O(1) instead of O(n).
- A heap does not give sorted iteration or fast search for arbitrary values, and it is not stable: equal priorities may leave in any order.

## Common pitfalls

- Wrong index formulas: with a zero-based array the children are \`2p + 1\` and \`2p + 2\`, not \`2p\` and \`2p + 1\`.
- Swapping with the larger child in \`siftDown\` breaks the heap; swap with the **smaller** child.
- Forgetting to check that the child indices are inside the array.
- Removing the root by shifting the whole array is O(n); move the last element to the root instead.
- Extracting from an empty heap: guard for it before reading \`heap[0]\`.

## What to watch in the visualizer

- \`this.heap\` is drawn as a tree with its backing array; the root is the minimum.
- On \`insert\` follow \`child\` and \`parent\` in \`siftUp\`: the new value climbs while it is smaller than its parent.
- On \`extractMin\`, the last value jumps to the root and sinks; \`parent\`, \`leftChild\` and \`rightChild\` show the comparisons.
- After every operation the heap property holds: each node is no bigger than its children.

## Example

\`\`\`
Input
["MinPriorityQueue", "insert", "insert", "insert", "insert", "peekMin", "extractMin", "extractMin", "size", "insert", "extractMin", "extractMin", "extractMin", "extractMin", "isEmpty"]
[[], [5], [3], [8], [1], [], [], [], [], [2], [], [], [], [], []]

Output
[null, null, null, null, null, 1, 1, 3, 2, null, 2, 5, 8, null, true]
\`\`\`
`;

export function buildPriorityQueue(): QuestionInput {
  return {
    slug: "priority-queue",
    title: "Priority Queue (Min-Heap)",
    difficulty: "Medium",
    tags: ["queue", "design", "heap", "priority-queue"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        ops: ["MinPriorityQueue", "insert", "insert", "insert", "insert", "peekMin", "extractMin", "extractMin", "size", "insert", "extractMin", "extractMin", "extractMin", "extractMin", "isEmpty"],
        args: [[], [5], [3], [8], [1], [], [], [], [], [2], [], [], [], [], []],
        expected: [null, null, null, null, null, 1, 1, 3, 2, null, 2, 5, 8, null, true],
      },
      {
        ops: ["MinPriorityQueue", "isEmpty", "insert", "extractMin"],
        args: [[], [], [4], []],
        expected: [null, true, null, 4],
      },
    ],
    visualHints: { "this.heap": "heap" },
  };
}
