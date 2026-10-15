import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Deque {
  constructor(capacity) {
    this.items = new Array(capacity).fill(null); // circular storage
    this.front = 0; // index of the first element
    this.count = 0; // number of stored elements
  }

  // Insert at the back: the slot just after the last element.
  pushBack(x) {
    if (this.isFull()) {
      return false;
    }
    const rear = (this.front + this.count) % this.items.length;
    this.items[rear] = x;
    this.count++;
    return true;
  }

  // Insert at the front: step front one slot to the left (wrapping around).
  pushFront(x) {
    if (this.isFull()) {
      return false;
    }
    const front = (this.front - 1 + this.items.length) % this.items.length;
    this.front = front;
    this.items[front] = x;
    this.count++;
    return true;
  }

  popFront() {
    if (this.isEmpty()) {
      return null;
    }
    const front = this.front;
    const value = this.items[front];
    this.items[front] = null;
    this.front = (front + 1) % this.items.length;
    this.count--;
    return value;
  }

  popBack() {
    if (this.isEmpty()) {
      return null;
    }
    const rear = (this.front + this.count - 1) % this.items.length;
    const value = this.items[rear];
    this.items[rear] = null;
    this.count--;
    return value;
  }

  peekFront() {
    if (this.isEmpty()) {
      return null;
    }
    const front = this.front;
    return this.items[front];
  }

  peekBack() {
    if (this.isEmpty()) {
      return null;
    }
    const rear = (this.front + this.count - 1) % this.items.length;
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

const DESCRIPTION = `A deque (double-ended queue, pronounced "deck") lets you insert and remove elements at **both** ends in O(1). It generalizes both the stack and the queue: use only one end and it is a stack; insert at the back and remove from the front and it is a queue. This implementation stores the elements in a circular array of fixed capacity.

## Intuition

A normal array queue wastes space because its indices only move right. If the array is treated as a **ring**, where the slot after the last one is the first again, the elements can live anywhere in the ring and both ends can move freely. Index arithmetic with \`% capacity\` does the wrapping: stepping right is \`(i + 1) % cap\`, stepping left is \`(i - 1 + cap) % cap\`.

The invariant: **the deque holds \`count\` elements in the slots \`front, front + 1, ..., front + count - 1\` (all modulo capacity).** The back element is therefore at \`(front + count - 1) % cap\`.

## How it works

1. **Constructor**: \`capacity\` empty slots, \`front = 0\`, \`count = 0\`.
2. **pushBack (x)**: if full, return \`false\`. Store \`x\` at \`rear = (front + count) % cap\` and increase \`count\`.
3. **pushFront (x)**: if full, return \`false\`. Move \`front\` one slot left (with wrap-around), store \`x\` there, increase \`count\`.
4. **popFront**: read \`items[front]\`, clear it, move \`front\` one slot right, decrease \`count\`.
5. **popBack**: read and clear the slot at \`rear = (front + count - 1) % cap\`, decrease \`count\`.
6. **peekFront / peekBack**: read those slots without changing anything.
7. **isEmpty**: \`count === 0\`. **isFull**: \`count === capacity\`.

## Walkthrough

Test case 0 uses \`capacity = 4\`. Logical order is written front first.

| Operation | \`front\` | \`items\` | Logical order | Result |
|-----------|---------|---------|---------------|--------|
| \`pushBack(1)\` | 0 | \`[1, null, null, null]\` | 1 | true |
| \`pushBack(2)\` | 0 | \`[1, 2, null, null]\` | 1, 2 | true |
| \`pushFront(3)\` | 3 | \`[1, 2, null, 3]\` | 3, 1, 2 | true (front wraps to 3) |
| \`pushFront(4)\` | 2 | \`[1, 2, 4, 3]\` | 4, 3, 1, 2 | true |
| \`isFull()\` | 2 | unchanged | | true |
| \`pushBack(5)\` | 2 | unchanged | | false |
| \`peekFront()\` / \`peekBack()\` | 2 | unchanged | | 4 / 2 |
| \`popFront()\` | 3 | \`[1, 2, null, 3]\` | 3, 1, 2 | 4 |
| \`popBack()\` | 3 | \`[1, null, null, 3]\` | 3, 1 | 2 |
| \`popFront()\` | 0 | \`[1, null, null, null]\` | 1 | 3 |
| \`popBack()\` | 0 | \`[null, null, null, null]\` | empty | 1 |
| \`popBack()\` | 0 | unchanged | empty | null |
| \`isEmpty()\` | 0 | unchanged | | true |

## Complexity

| Operation | Time | Why |
|-----------|------|-----|
| pushFront, pushBack, popFront, popBack | O(1) | index arithmetic only; no shifting |
| peekFront, peekBack, isEmpty, isFull | O(1) | one slot or one counter |
| Space | O(capacity) | one fixed array |

## When to use it

- Sliding-window problems (monotonic deque for window maximum), palindrome checks, undo/redo with a size limit, work-stealing schedulers, and BFS variants like 0-1 BFS.
- Compared with a plain array queue: no drifting front and no wasted slots. Compared with a linked list: better cache behaviour and no per-node allocation, but a fixed capacity unless you resize.
- If you only need one end, a stack or a simple queue states your intent more clearly.

## Common pitfalls

- Stepping left with \`(front - 1) % cap\` gives a negative index in JavaScript; add \`cap\` first.
- Telling full from empty: \`front\` and the back index look the same in both cases. Keeping a \`count\` (as here) removes the ambiguity.
- Forgetting to wrap after \`pushBack\`/\`popFront\` indices reach \`cap\`.
- Computing the back index as \`front + count\` instead of \`front + count - 1\` when you want the last element.

## What to watch in the visualizer

- The locals \`front\` and \`rear\` are computed before each access to \`this.items\`, so their chips show on the cells being read or written. After \`pushFront(3)\`, \`front\` jumps from 0 to the last cell: that is the wrap-around.
- The filled cells are not always contiguous on screen; they are contiguous around the ring.
- \`count\` goes up on every push and down on every pop and decides isFull / isEmpty.

## Example

\`\`\`
Input
["Deque", "pushBack", "pushBack", "pushFront", "pushFront", "isFull", "pushBack", "peekFront", "peekBack", "popFront", "popBack", "popFront", "popBack", "popBack", "isEmpty"]
[[4], [1], [2], [3], [4], [], [5], [], [], [], [], [], [], [], []]

Output
[null, true, true, true, true, true, false, 4, 2, 4, 2, 3, 1, null, true]
\`\`\`
`;

export function buildDeque(): QuestionInput {
  return {
    slug: "deque",
    title: "Deque (Double-Ended Queue)",
    difficulty: "Medium",
    tags: ["queue", "design", "deque", "circular-array"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        ops: ["Deque", "pushBack", "pushBack", "pushFront", "pushFront", "isFull", "pushBack", "peekFront", "peekBack", "popFront", "popBack", "popFront", "popBack", "popBack", "isEmpty"],
        args: [[4], [1], [2], [3], [4], [], [5], [], [], [], [], [], [], [], []],
        expected: [null, true, true, true, true, true, false, 4, 2, 4, 2, 3, 1, null, true],
      },
      {
        ops: ["Deque", "pushFront", "pushBack", "popBack", "popFront", "isEmpty"],
        args: [[3], [1], [2], [], [], []],
        expected: [null, true, true, 2, 1, true],
      },
    ],
    visualHints: { "this.items": "array" },
  };
}
