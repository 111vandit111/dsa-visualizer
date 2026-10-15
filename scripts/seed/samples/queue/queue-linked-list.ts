import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class LinkedListQueue {
  constructor() {
    this.head = null; // front of the queue (next to leave)
    this.tail = null; // rear of the queue (last to arrive)
    this.length = 0;
  }

  // Enqueue: append a node after the current tail.
  enqueue(x) {
    const node = new ListNode(x, null);
    if (this.tail === null) {
      this.head = node; // first element is both head and tail
    } else {
      this.tail.next = node;
    }
    this.tail = node;
    this.length++;
  }

  // Dequeue: unlink the head and return its value, or null if empty.
  dequeue() {
    if (this.head === null) {
      return null;
    }
    const value = this.head.val;
    this.head = this.head.next;
    if (this.head === null) {
      this.tail = null; // the queue became empty
    }
    this.length--;
    return value;
  }

  peekFront() {
    if (this.head === null) {
      return null;
    }
    return this.head.val;
  }

  isEmpty() {
    return this.head === null;
  }

  size() {
    return this.length;
  }
}
`;

const DESCRIPTION = `A queue is a **FIFO** (first in, first out) collection. This version stores the elements in a singly linked list with two references: \`head\` (the front, where elements leave) and \`tail\` (the rear, where elements join). Both enqueue and dequeue are O(1), and there is no capacity limit and no wasted slots.

## Intuition

A line of people is naturally a chain: everyone knows who is behind them. To serve the front person you move \`head\` one node forward; to add a newcomer you hang a node after \`tail\`. Keeping a \`tail\` reference is the trick: without it, finding the end of the list would take O(n) on every enqueue.

The invariant: **\`head\` is the oldest element, following \`next\` links reaches \`tail\`, \`tail.next\` is \`null\`, and both are \`null\` exactly when the queue is empty.**

## How it works

1. **Constructor**: \`head = null\`, \`tail = null\`, \`length = 0\`.
2. **Enqueue (x)**: create a node. If the queue is empty, it becomes both \`head\` and \`tail\`; otherwise link it after the current \`tail\` (\`tail.next = node\`). Then move \`tail\` to the new node.
3. **Dequeue**: if \`head\` is \`null\`, return \`null\`. Otherwise read \`head.val\` and set \`head = head.next\`. If \`head\` becomes \`null\`, also set \`tail = null\`.
4. **Peek front**: return \`head.val\`.
5. **Is Empty**: \`head === null\`. **Size**: the stored \`length\`.

## Walkthrough

Test case 0 (lists are written front first):

| Operation | List after | Result |
|-----------|-----------|--------|
| \`enqueue(1)\` | \`1\` (head = tail) | - |
| \`enqueue(2)\` | \`1 -> 2\` | - |
| \`enqueue(3)\` | \`1 -> 2 -> 3\` | - |
| \`peekFront()\` | \`1 -> 2 -> 3\` | 1 |
| \`dequeue()\` | \`2 -> 3\` | 1 |
| \`dequeue()\` | \`3\` (head = tail) | 2 |
| \`enqueue(4)\` | \`3 -> 4\` | - |
| \`size()\` | \`3 -> 4\` | 2 |
| \`dequeue()\` | \`4\` | 3 |
| \`dequeue()\` | empty (head and tail \`null\`) | 4 |
| \`dequeue()\` | empty | null |
| \`isEmpty()\` | empty | true |

## Complexity

| Operation | Time | Why |
|-----------|------|-----|
| Enqueue | O(1) | the \`tail\` reference gives direct access to the end |
| Dequeue, Peek | O(1) | only the head pointer is used |
| Is Empty, Size | O(1) | a null check or a stored counter |
| Space | O(n) | one node per element plus its pointer |

## When to use it

- When the queue can grow without a known limit, or when you want to avoid the full-queue problem of a linear array queue.
- It costs an allocation and a pointer per element and has poorer cache locality than an array or circular queue.
- For a fixed-size buffer, a circular array queue is simpler and faster.

## Common pitfalls

- Forgetting to reset \`tail\` to \`null\` when the last element is dequeued leaves a dangling reference to a removed node.
- Forgetting to set \`head\` when the first element is enqueued, so the queue stays "empty".
- Linking the new node but not moving \`tail\` forward, so the next enqueue overwrites it.
- Keeping only a \`head\` reference makes enqueue O(n).

## What to watch in the visualizer

- \`this.head\` shows the chain; follow the nodes from the front. The \`tail\` variable points at the last node.
- On an enqueue only the last node's \`next\` and \`tail\` change. On a dequeue only \`head\` moves.
- When the queue has one node, \`head\` and \`tail\` point at the same node. After the last dequeue both become \`null\`.

## Example

\`\`\`
Input
["LinkedListQueue", "enqueue", "enqueue", "enqueue", "peekFront", "dequeue", "dequeue", "enqueue", "size", "dequeue", "dequeue", "dequeue", "isEmpty"]
[[], [1], [2], [3], [], [], [], [4], [], [], [], [], []]

Output
[null, null, null, null, 1, 1, 2, null, 2, 3, 4, null, true]
\`\`\`
`;

export function buildQueueLinkedList(): QuestionInput {
  return {
    slug: "queue-linked-list",
    title: "Queue (Linked List Implementation)",
    difficulty: "Easy",
    tags: ["queue", "design", "linked-list", "fifo"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        ops: ["LinkedListQueue", "enqueue", "enqueue", "enqueue", "peekFront", "dequeue", "dequeue", "enqueue", "size", "dequeue", "dequeue", "dequeue", "isEmpty"],
        args: [[], [1], [2], [3], [], [], [], [4], [], [], [], [], []],
        expected: [null, null, null, null, 1, 1, 2, null, 2, 3, 4, null, true],
      },
      {
        ops: ["LinkedListQueue", "enqueue", "dequeue", "isEmpty"],
        args: [[], [5], [], []],
        expected: [null, null, 5, true],
      },
    ],
    visualHints: { "this.head": "linkedlist" },
  };
}
