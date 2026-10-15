import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class LinkedListStack {
  constructor() {
    this.head = null; // the top of the stack
    this.length = 0;
  }

  // Push: the new node becomes the head and points at the old head.
  push(x) {
    this.head = new ListNode(x, this.head);
    this.length++;
  }

  // Pop: unlink the head and return its value, or null if empty.
  pop() {
    if (this.head === null) {
      return null;
    }
    const value = this.head.val;
    this.head = this.head.next;
    this.length--;
    return value;
  }

  peek() {
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

const DESCRIPTION = `A stack is a **LIFO** (last in, first out) collection. This version stores the elements in a singly linked list where the **head** is the top of the stack. Push and pop both work at the head, so every operation is O(1), and the stack never overflows until memory runs out.

## Intuition

A linked list gives cheap insertion and removal at its front: you only change one pointer. A stack only ever needs that one end, so the head of a list is a perfect "top". Instead of an index into an array, the top is a reference to a node, and each node remembers the one underneath it.

The invariant: **\`head\` is the newest element, \`head.next\` is the one pushed before it, and so on until \`null\`; \`length\` equals the number of nodes.**

## How it works

1. **Constructor**: \`head = null\`, \`length = 0\`.
2. **Push (x)**: create a new node whose \`next\` is the current head, then make it the head.
3. **Pop**: if \`head\` is \`null\` return \`null\`. Otherwise remember \`head.val\`, move \`head\` to \`head.next\`, and return the value.
4. **Peek**: return \`head.val\` without moving anything (or \`null\` if empty).
5. **Is Empty**: \`head === null\`.
6. **Size**: return the \`length\` counter (walking the list would cost O(n)).

## Walkthrough

Test case 0 (the list is written top first):

| Operation | List after (top first) | Result |
|-----------|------------------------|--------|
| \`push(1)\` | \`1\` | - |
| \`push(2)\` | \`2 -> 1\` | - |
| \`push(3)\` | \`3 -> 2 -> 1\` | - |
| \`peek()\` | \`3 -> 2 -> 1\` | 3 |
| \`pop()\` | \`2 -> 1\` | 3 |
| \`size()\` | \`2 -> 1\` | 2 |
| \`pop()\` | \`1\` | 2 |
| \`pop()\` | empty | 1 |
| \`pop()\` | empty | null |
| \`isEmpty()\` | empty | true |

## Complexity

| Operation | Time | Why |
|-----------|------|-----|
| Push, Pop, Peek | O(1) | only the head pointer changes |
| Is Empty, Size | O(1) | a null check or a stored counter |
| Space | O(n) | one node per element, plus the pointer in each node |

## When to use it

- When the size is unpredictable and you do not want a capacity limit or occasional array resizing.
- Every push allocates a node and each node stores a pointer, so it uses more memory and has worse cache behaviour than the array stack.
- If the maximum size is known, the array version is usually faster. If you need access by position, neither a stack nor a linked list is a good fit.

## Common pitfalls

- Forgetting to link the new node to the old head before moving \`head\` loses the whole stack.
- Popping from an empty stack: \`head.val\` on \`null\` throws. Check for \`null\` first.
- Not updating \`length\` on every push and pop makes \`size()\` wrong.
- Pushing at the tail instead of the head makes pop O(n) with a singly linked list.

## What to watch in the visualizer

- \`this.head\` is drawn as a linked list; the first node is the top of the stack.
- On a push a new node appears in front and its arrow points to the previous head; on a pop the first node disappears and \`head\` moves one node on.
- Watch \`length\` increase and decrease in step with the nodes.
- When the list is empty, \`this.head\` is \`null\`, and \`peek\` / \`pop\` return \`null\`.

## Example

\`\`\`
Input
["LinkedListStack", "push", "push", "push", "peek", "pop", "size", "pop", "pop", "pop", "isEmpty"]
[[], [1], [2], [3], [], [], [], [], [], [], []]

Output
[null, null, null, null, 3, 3, 2, 2, 1, null, true]
\`\`\`
`;

export function buildStackLinkedList(): QuestionInput {
  return {
    slug: "stack-linked-list",
    title: "Stack (Linked List Implementation)",
    difficulty: "Easy",
    tags: ["stack", "design", "linked-list", "lifo"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        ops: ["LinkedListStack", "push", "push", "push", "peek", "pop", "size", "pop", "pop", "pop", "isEmpty"],
        args: [[], [1], [2], [3], [], [], [], [], [], [], []],
        expected: [null, null, null, null, 3, 3, 2, 2, 1, null, true],
      },
      {
        ops: ["LinkedListStack", "isEmpty", "push", "pop", "isEmpty"],
        args: [[], [], [9], [], []],
        expected: [null, true, null, 9, true],
      },
    ],
    visualHints: { "this.head": "linkedlist" },
  };
}
