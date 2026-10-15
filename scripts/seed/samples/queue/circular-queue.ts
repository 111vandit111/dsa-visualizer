import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class CircularQueue {
  constructor(capacity) {
    this.items = new Array(capacity).fill(null); // ring buffer
    this.frontIndex = 0; // slot of the oldest element
    this.count = 0; // number of stored elements
  }

  // Enqueue: write into the first free slot after the last element.
  enqueue(x) {
    if (this.isFull()) {
      return false;
    }
    const rear = (this.frontIndex + this.count) % this.items.length; // wraps past the end
    this.items[rear] = x;
    this.count++;
    return true;
  }

  // Dequeue: remove the oldest element and advance the front with wrap-around.
  dequeue() {
    if (this.isEmpty()) {
      return null;
    }
    const front = this.frontIndex;
    const value = this.items[front];
    this.items[front] = null;
    this.frontIndex = (front + 1) % this.items.length;
    this.count--;
    return value;
  }

  // The oldest element, or null if the queue is empty.
  front() {
    if (this.isEmpty()) {
      return null;
    }
    const front = this.frontIndex;
    return this.items[front];
  }

  // The newest element, or null if the queue is empty.
  rear() {
    if (this.isEmpty()) {
      return null;
    }
    const rear = (this.frontIndex + this.count - 1) % this.items.length;
    return this.items[rear];
  }

  isEmpty() {
    return this.count === 0;
  }

  isFull() {
    return this.count === this.items.length;
  }
}
`;

const DESCRIPTION = `A circular queue (ring buffer) is a fixed-capacity FIFO queue whose indices wrap around the end of the array using modulo arithmetic. It fixes the "drifting front" problem of the plain array queue: slots freed by dequeues are reused by later enqueues, so the queue is full only when it really holds \`capacity\` elements.

## Intuition

Bend the array into a circle so that the last slot is followed by the first. A reader (the front) and a writer (the rear) chase each other around the ring. Dequeue advances the front; enqueue writes just behind the last element; both wrap with \`% capacity\`.

The invariant: **the queue holds \`count\` elements in the slots \`frontIndex, frontIndex + 1, ..., frontIndex + count - 1\` (mod capacity).** The next free slot is \`(frontIndex + count) % capacity\`. Tracking \`count\` separately removes the classic ambiguity that "front equals rear" can mean either empty or full.

## How it works

1. **Constructor**: \`capacity\` slots, \`frontIndex = 0\`, \`count = 0\`.
2. **Enqueue (x)**: if \`count === capacity\`, return \`false\`. Otherwise write \`x\` at \`rear = (frontIndex + count) % capacity\` and \`count++\`.
3. **Dequeue**: if empty, return \`null\`. Otherwise read \`items[frontIndex]\`, clear it, set \`frontIndex = (frontIndex + 1) % capacity\`, \`count--\`.
4. **front()**: return \`items[frontIndex]\`. **rear()**: return the element at \`(frontIndex + count - 1) % capacity\`.
5. **isEmpty**: \`count === 0\`. **isFull**: \`count === capacity\`.

## Walkthrough

Test case 0 uses \`capacity = 4\`.

| Operation | \`frontIndex\` | \`count\` | \`items\` after | Result |
|-----------|--------------|---------|---------------|--------|
| \`enqueue(1)\` to \`enqueue(4)\` | 0 | 4 | \`[1, 2, 3, 4]\` | true each |
| \`isFull()\` | 0 | 4 | unchanged | true |
| \`enqueue(9)\` | 0 | 4 | unchanged | false |
| \`dequeue()\` | 1 | 3 | \`[null, 2, 3, 4]\` | 1 |
| \`dequeue()\` | 2 | 2 | \`[null, null, 3, 4]\` | 2 |
| \`enqueue(5)\` | 2 | 3 | \`[5, null, 3, 4]\` | true (rear wrapped to 0) |
| \`enqueue(6)\` | 2 | 4 | \`[5, 6, 3, 4]\` | true (slot 1) |
| \`front()\` / \`rear()\` | 2 | 4 | unchanged | 3 / 6 |
| \`isFull()\` | 2 | 4 | unchanged | true |
| \`dequeue()\` x4 | ends at 2 (3, 0, 1, 2 on the way) | 3 down to 0 | emptied | 3, 4, 5, 6 |
| \`isEmpty()\` | 2 | 0 | all \`null\` | true |

With the plain array queue the same sequence would have failed at \`enqueue(5)\`: its rear would still be at the last slot.

## Complexity

| Operation | Time | Why |
|-----------|------|-----|
| Enqueue, Dequeue, front, rear | O(1) | one modulo computation and one slot access |
| isEmpty, isFull | O(1) | compare \`count\` |
| Space | O(capacity) | one fixed array; no wasted slots |

## When to use it

- Bounded buffers: producer/consumer pipelines, keyboard and network buffers, audio streams, logging "last N items", BFS with a known bound.
- Better than the linear array queue (no drift) and than the linked queue for speed and cache locality; the cost is a fixed capacity.
- When the limit is unknown, use a linked-list queue or grow (copy into a bigger ring) when full.

## Common pitfalls

- Using only \`front\` and \`rear\` and no counter: \`front === rear\` is ambiguous (empty or full). Leave one slot unused, or keep a \`count\` as here.
- Forgetting the modulo in either enqueue or dequeue so an index runs past the end of the array.
- Computing \`rear()\` as \`(frontIndex + count) % cap\`, which is the *next free* slot, not the last element.
- Mixing up capacity (slots) and count (elements).

## What to watch in the visualizer

- The locals \`front\` (in \`dequeue\` and \`front()\`) and \`rear\` (in \`enqueue\` and \`rear()\`) are copied from the fields before indexing, so their chips appear on \`this.items\`; they move in the same direction and wrap from the last cell to the first.
- After \`enqueue(5)\` the new value lands in cell 0 even though the queue "started" there: the wrap-around is the whole point.
- \`count\` rises on enqueue and falls on dequeue; it alone decides empty/full.

## Example

\`\`\`
Input
["CircularQueue", "enqueue", "enqueue", "enqueue", "enqueue", "isFull", "enqueue", "dequeue", "dequeue", "enqueue", "enqueue", "front", "rear", "isFull", "dequeue", "dequeue", "dequeue", "dequeue", "isEmpty"]
[[4], [1], [2], [3], [4], [], [9], [], [], [5], [6], [], [], [], [], [], [], [], []]

Output
[null, true, true, true, true, true, false, 1, 2, true, true, 3, 6, true, 3, 4, 5, 6, true]
\`\`\`
`;

export function buildCircularQueue(): QuestionInput {
  return {
    slug: "circular-queue",
    title: "Circular Queue",
    difficulty: "Medium",
    tags: ["queue", "design", "circular-array", "fifo"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        ops: ["CircularQueue", "enqueue", "enqueue", "enqueue", "enqueue", "isFull", "enqueue", "dequeue", "dequeue", "enqueue", "enqueue", "front", "rear", "isFull", "dequeue", "dequeue", "dequeue", "dequeue", "isEmpty"],
        args: [[4], [1], [2], [3], [4], [], [9], [], [], [5], [6], [], [], [], [], [], [], [], []],
        expected: [null, true, true, true, true, true, false, 1, 2, true, true, 3, 6, true, 3, 4, 5, 6, true],
      },
      {
        ops: ["CircularQueue", "front", "enqueue", "rear", "dequeue", "isEmpty"],
        args: [[2], [], [8], [], [], []],
        expected: [null, null, true, 8, 8, true],
      },
    ],
    visualHints: { "this.items": "array" },
  };
}
