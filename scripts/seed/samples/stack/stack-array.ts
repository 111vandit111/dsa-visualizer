import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class ArrayStack {
  constructor(capacity) {
    this.items = new Array(capacity).fill(null); // fixed-size storage
    this.top = -1; // index of the top element; -1 means empty
  }

  // Push: put x on top. Returns false on overflow.
  push(x) {
    if (this.isFull()) {
      return false;
    }
    this.top++;
    const top = this.top;
    this.items[top] = x;
    return true;
  }

  // Pop: remove and return the top element, or null on underflow.
  pop() {
    if (this.isEmpty()) {
      return null;
    }
    const top = this.top;
    const value = this.items[top];
    this.items[top] = null;
    this.top--;
    return value;
  }

  // Peek: read the top element without removing it.
  peek() {
    if (this.isEmpty()) {
      return null;
    }
    const top = this.top;
    return this.items[top];
  }

  isEmpty() {
    return this.top === -1;
  }

  isFull() {
    return this.top === this.items.length - 1;
  }

  size() {
    return this.top + 1;
  }
}
`;

const DESCRIPTION = `A stack is a collection that follows **LIFO** (last in, first out): the most recently added element is the first one removed. This array implementation stores the items in a fixed-size array and keeps a single index, \`top\`, that points to the newest element. It supports Push, Pop, Peek, Is Empty and Is Full, all in constant time.

## Intuition

Think of a stack of plates: you add a plate on top and take a plate from the top; the plate at the bottom has to wait. Because every operation touches only one end, we do not need to move any data. We only move the \`top\` index.

The invariant: **\`items[0..top]\` are the stored elements (oldest at index 0), and \`top === -1\` exactly when the stack is empty.** The stack is full when \`top === capacity - 1\`.

## How it works

1. **Constructor**: allocate \`capacity\` slots and set \`top = -1\`.
2. **Push (x)**: if full, report overflow (\`false\`). Otherwise \`top++\` and store \`x\` at \`items[top]\`.
3. **Pop**: if empty, report underflow (\`null\`). Otherwise read \`items[top]\`, clear that slot and \`top--\`.
4. **Peek**: if empty return \`null\`; otherwise return \`items[top]\` without changing \`top\`.
5. **Is Empty**: \`top === -1\`.
6. **Is Full**: \`top === capacity - 1\`.
7. **Size**: \`top + 1\`.

## Walkthrough

Test case 0 uses \`capacity = 3\`.

| Operation | \`top\` after | \`items\` after | Result |
|-----------|-------------|---------------|--------|
| \`push(10)\` | 0 | \`[10, null, null]\` | true |
| \`push(20)\` | 1 | \`[10, 20, null]\` | true |
| \`push(30)\` | 2 | \`[10, 20, 30]\` | true |
| \`isFull()\` | 2 | unchanged | true |
| \`push(40)\` | 2 | unchanged | false (overflow) |
| \`peek()\` | 2 | unchanged | 30 |
| \`pop()\` | 1 | \`[10, 20, null]\` | 30 |
| \`size()\` | 1 | unchanged | 2 |
| \`pop()\` | 0 | \`[10, null, null]\` | 20 |
| \`pop()\` | -1 | \`[null, null, null]\` | 10 |
| \`pop()\` | -1 | unchanged | null (underflow) |
| \`isEmpty()\` | -1 | unchanged | true |

## Complexity

| Operation | Time | Why |
|-----------|------|-----|
| Push, Pop, Peek | O(1) | only the slot at \`top\` is touched |
| Is Empty, Is Full, Size | O(1) | a comparison on \`top\` |
| Space | O(capacity) | the array is allocated up front |

## When to use it

- When the maximum size is known in advance or a hard limit is wanted. Array access is cache friendly and has no per-element allocation.
- Typical uses: undo history, function call stacks, expression evaluation, depth-first search, balanced-bracket checks.
- Weakness: the capacity is fixed, so a push can overflow. A dynamic array (resize by doubling) or the linked-list stack removes the limit, at the cost of occasional O(n) resizes or extra memory per node.

## Common pitfalls

- Reading \`items[top]\` on an empty stack (\`top = -1\`) returns \`undefined\`. Check \`isEmpty()\` first.
- Forgetting the overflow check when pushing onto a full stack writes outside the intended range.
- Off-by-one: \`top\` is an **index**, so the size is \`top + 1\`.
- Not clearing a popped slot can keep a stale reference alive (a memory leak in languages with objects).
- Mixing up Peek and Pop: Peek must not change \`top\`.

## What to watch in the visualizer

- Each method copies the field into a local \`top\` (\`const top = this.top\`) before indexing, so the \`top\` chip appears on \`this.items\` at the newest element: it lands one cell to the right on a push and on the cell being cleared on a pop. The field \`this.top\` itself shows the same number in the object view.
- On a pop the cell becomes \`null\` and \`top\` decreases; the value is returned from the method.
- Failed operations (\`push(40)\` when full, \`pop()\` when empty) change nothing: watch that \`top\` stays put.
- Each operation is its own visualized step, so use the call frames to see which method is running.

## Example

\`\`\`
Input
["ArrayStack", "push", "push", "push", "isFull", "push", "peek", "pop", "size", "pop", "pop", "pop", "isEmpty"]
[[3], [10], [20], [30], [], [40], [], [], [], [], [], [], []]

Output
[null, true, true, true, true, false, 30, 30, 2, 20, 10, null, true]
\`\`\`
`;

export function buildStackArray(): QuestionInput {
  return {
    slug: "stack-array",
    title: "Stack (Array Implementation)",
    difficulty: "Easy",
    tags: ["stack", "design", "array", "lifo"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        ops: ["ArrayStack", "push", "push", "push", "isFull", "push", "peek", "pop", "size", "pop", "pop", "pop", "isEmpty"],
        args: [[3], [10], [20], [30], [], [40], [], [], [], [], [], [], []],
        expected: [null, true, true, true, true, false, 30, 30, 2, 20, 10, null, true],
      },
      {
        ops: ["ArrayStack", "isEmpty", "push", "peek", "pop", "isEmpty"],
        args: [[2], [], [7], [], [], []],
        expected: [null, true, true, 7, 7, true],
      },
    ],
    visualHints: { "this.items": "array" },
  };
}
