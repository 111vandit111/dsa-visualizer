import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class ArrayQueue {
  constructor(capacity) {
    this.items = new Array(capacity).fill(null); // fixed-size storage
    this.front = 0; // index of the oldest element
    this.rear = -1; // index of the newest element
  }

  // Enqueue: add x at the rear. Returns false on overflow.
  enqueue(x) {
    if (this.isFull()) {
      return false;
    }
    this.rear++;
    const rear = this.rear;
    this.items[rear] = x;
    return true;
  }

  // Dequeue: remove and return the front element, or null if empty.
  dequeue() {
    if (this.isEmpty()) {
      return null;
    }
    const front = this.front;
    const value = this.items[front];
    this.items[front] = null;
    this.front++; // the front only ever moves right ("drifts")
    return value;
  }

  peekFront() {
    if (this.isEmpty()) {
      return null;
    }
    const front = this.front;
    return this.items[front];
  }

  isEmpty() {
    return this.front > this.rear;
  }

  isFull() {
    return this.rear === this.items.length - 1;
  }
}
`;

const DESCRIPTION = `A queue is a collection that follows **FIFO** (first in, first out): elements leave in the order they arrived. This is the **single-ended queue** (the ordinary queue): items enter at the rear and leave from the front. It is stored in a fixed-size array with two indices, \`front\` and \`rear\`. The example also shows its main weakness, the "drifting front", which the circular queue fixes.

## Intuition

Picture a line at a ticket counter: new people join at the back, and the person at the front is served first. In the array, \`rear\` is the last occupied slot and \`front\` is the first. Enqueue moves \`rear\` one step right; dequeue moves \`front\` one step right.

The invariant: **the queue contains \`items[front..rear]\`; it is empty when \`front > rear\` and full when \`rear === capacity - 1\`.**

## How it works

1. **Constructor**: allocate \`capacity\` slots, \`front = 0\`, \`rear = -1\`.
2. **Enqueue (x)**: if \`rear\` is at the last slot, report overflow (\`false\`). Otherwise \`rear++\` and store \`x\` at \`items[rear]\`.
3. **Dequeue**: if \`front > rear\`, return \`null\` (underflow). Otherwise read \`items[front]\`, clear it and \`front++\`.
4. **Peek front**: return \`items[front]\` without moving \`front\`.
5. **Is Empty**: \`front > rear\`. **Is Full**: \`rear === capacity - 1\`.

**Single-ended queue vs deque.** A single-ended queue inserts at one end (rear) and removes at the other (front). A **deque** (double-ended queue) can insert and remove at *both* ends; see the Deque sample. A queue is a restricted deque.

**The drifting front.** Dequeued slots on the left are never reused, because \`front\` and \`rear\` only move right. Once \`rear\` hits the last index the queue reports "full" even if most slots are free. The cure is the *circular queue*, where indices wrap around with \`% capacity\` so freed slots are reused.

## Walkthrough

Test case 0 uses \`capacity = 4\`.

| Operation | \`front\` | \`rear\` | \`items\` after | Result |
|-----------|---------|--------|---------------|--------|
| \`enqueue(5)\` | 0 | 0 | \`[5, null, null, null]\` | true |
| \`enqueue(6)\` | 0 | 1 | \`[5, 6, null, null]\` | true |
| \`enqueue(7)\` | 0 | 2 | \`[5, 6, 7, null]\` | true |
| \`dequeue()\` | 1 | 2 | \`[null, 6, 7, null]\` | 5 |
| \`peekFront()\` | 1 | 2 | unchanged | 6 |
| \`enqueue(8)\` | 1 | 3 | \`[null, 6, 7, 8]\` | true |
| \`isFull()\` | 1 | 3 | unchanged | true (slot 0 is free but unusable!) |
| \`enqueue(9)\` | 1 | 3 | unchanged | false |
| \`dequeue()\` x3 | 4 | 3 | all \`null\` | 6, 7, 8 |
| \`isEmpty()\` | 4 | 3 | unchanged | true |
| \`isFull()\` | 4 | 3 | unchanged | true (the queue is empty yet reports full: \`rear\` is still at the last slot, so the freed slots can never be reused) |

## Complexity

| Operation | Time | Why |
|-----------|------|-----|
| Enqueue, Dequeue, Peek | O(1) | only one index moves; no elements are shifted |
| Is Empty, Is Full | O(1) | one comparison |
| Space | O(capacity) | the array is allocated up front |

## When to use it

- Simple bounded buffers where the total number of items ever enqueued is small, or where the queue is reset when it empties.
- In practice use a circular queue (same cost, no wasted space) or a linked-list queue (no capacity limit).
- Queues drive breadth-first search, task scheduling, print spoolers and message buffers.

## Common pitfalls

- Shifting all elements left on every dequeue keeps the front at 0 but makes dequeue O(n).
- Treating \`rear === capacity - 1\` as "no elements" or \`front === 0\` as empty; emptiness is \`front > rear\`.
- Forgetting that a full queue with free slots at the left is a design limit, not a bug.
- Reading \`items[front]\` on an empty queue returns \`null\` or a stale value.

## What to watch in the visualizer

- Each method copies the field into a local (\`const front = this.front\`, \`const rear = this.rear\`) before indexing, so the \`front\` and \`rear\` chips appear on \`this.items\` while a method runs: the chip sits on the cell being read or written. The filled cells are between the two fields' values.
- Dequeue clears the cell at \`front\` and moves \`front\` right; the cell is never refilled.
- After \`enqueue(8)\`, \`rear\` is at the last cell while cell 0 is empty: that is the drifting-front waste.
- The failed \`enqueue(9)\` changes nothing.

## Example

\`\`\`
Input
["ArrayQueue", "enqueue", "enqueue", "enqueue", "dequeue", "peekFront", "enqueue", "isFull", "enqueue", "dequeue", "dequeue", "dequeue", "isEmpty", "isFull"]
[[4], [5], [6], [7], [], [], [8], [], [9], [], [], [], [], []]

Output
[null, true, true, true, 5, 6, true, true, false, 6, 7, 8, true, true]
\`\`\`
`;

export function buildQueueArray(): QuestionInput {
  return {
    slug: "queue-array",
    title: "Queue (Array Implementation)",
    difficulty: "Easy",
    tags: ["queue", "design", "array", "fifo"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        ops: ["ArrayQueue", "enqueue", "enqueue", "enqueue", "dequeue", "peekFront", "enqueue", "isFull", "enqueue", "dequeue", "dequeue", "dequeue", "isEmpty", "isFull"],
        args: [[4], [5], [6], [7], [], [], [8], [], [9], [], [], [], [], []],
        expected: [null, true, true, true, 5, 6, true, true, false, 6, 7, 8, true, true],
      },
      {
        ops: ["ArrayQueue", "isEmpty", "enqueue", "dequeue", "dequeue"],
        args: [[2], [], [3], [], []],
        expected: [null, true, true, 3, null],
      },
    ],
    visualHints: { "this.items": "array" },
  };
}
