import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class DoublyLinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
  }

  // Add a node in front of head. O(1).
  insertHead(value) {
    const node = new DNode(value);
    node.next = this.head;
    if (this.head !== null) {
      this.head.prev = node;
    } else {
      this.tail = node; // first node is both head and tail
    }
    this.head = node;
  }

  // Add a node after tail. O(1) thanks to the tail pointer.
  insertTail(value) {
    const node = new DNode(value);
    node.prev = this.tail;
    if (this.tail !== null) {
      this.tail.next = node;
    } else {
      this.head = node;
    }
    this.tail = node;
  }

  // Insert a new node right after the first node holding \`target\`.
  insertAfter(target, value) {
    let curr = this.head;
    while (curr !== null && curr.val !== target) {
      curr = curr.next;
    }
    if (curr === null) return false;

    const node = new DNode(value);
    node.prev = curr;
    node.next = curr.next;
    if (curr.next !== null) {
      curr.next.prev = node;
    } else {
      this.tail = node; // inserted after the old tail
    }
    curr.next = node;
    return true;
  }

  // Unlink the first node holding \`value\`. Needs no "previous" variable.
  delete(value) {
    let curr = this.head;
    while (curr !== null && curr.val !== value) {
      curr = curr.next;
    }
    if (curr === null) return false;

    if (curr.prev !== null) {
      curr.prev.next = curr.next;
    } else {
      this.head = curr.next; // deleting the head
    }
    if (curr.next !== null) {
      curr.next.prev = curr.prev;
    } else {
      this.tail = curr.prev; // deleting the tail
    }
    return true;
  }

  // Forward traversal: head to tail through next.
  toArray() {
    const values = [];
    let curr = this.head;
    while (curr !== null) {
      values.push(curr.val);
      curr = curr.next;
    }
    return values;
  }

  // Backward traversal: tail to head through prev.
  toArrayReverse() {
    const values = [];
    let curr = this.tail;
    while (curr !== null) {
      values.push(curr.val);
      curr = curr.prev;
    }
    return values;
  }
}

class DNode {
  constructor(val) {
    this.val = val;
    this.prev = null;
    this.next = null;
  }
}
`;

const DESCRIPTION = `A **doubly linked list** is a chain of nodes where every node knows both its successor (\`next\`) and its predecessor (\`prev\`). That second pointer lets you walk the list in either direction and unlink a node without hunting for the node before it. This sample keeps both a \`head\` and a \`tail\` pointer and implements insertion at both ends, insertion after a value, deletion, and forward/backward traversal.

## Intuition

A singly linked list is a one-way street; a doubly linked list is a two-way street. Because each node points back to its neighbour, a node can remove itself: "tell my left neighbour that its right neighbour is now my right neighbour, and tell my right neighbour that its left neighbour is now my left neighbour". The price is one extra pointer per node and twice as many pointers to keep consistent.

The invariant: for every node \`n\`, \`n.next.prev === n\` and \`n.prev.next === n\`, \`head.prev === null\` and \`tail.next === null\`. Each operation touches up to four pointers and must restore this invariant before returning.

## How it works

1. **insertHead(value)**: the new node's \`next\` is the old head. If the list was non-empty, the old head's \`prev\` becomes the new node; otherwise the new node is also the \`tail\`. Finally \`head\` moves to the new node.
2. **insertTail(value)**: mirror image: the new node's \`prev\` is the old tail, the old tail's \`next\` becomes the new node, and \`tail\` moves.
3. **insertAfter(target, value)**: scan for the first node holding \`target\`. Link the new node to \`curr\` on its left and \`curr.next\` on its right, then fix the neighbours: \`curr.next.prev = node\` (or \`tail = node\` when inserting after the tail) and \`curr.next = node\`.
4. **delete(value)**: scan for the node. Make its left neighbour skip it (\`curr.prev.next = curr.next\`, or move \`head\` if there is no left neighbour), and make its right neighbour skip it (\`curr.next.prev = curr.prev\`, or move \`tail\`).
5. **toArray()**: start at \`head\`, follow \`next\`.
6. **toArrayReverse()**: start at \`tail\`, follow \`prev\`. This is what a singly linked list cannot do.

## Walkthrough

Test case 0, list shown head to tail:

| # | Operation | List after | Returns |
|---|-----------|-----------|---------|
| 1 | \`insertTail(2)\` | \`2\` (head = tail = 2) | - |
| 2 | \`insertHead(1)\` | \`1 <-> 2\` | - |
| 3 | \`insertTail(4)\` | \`1 <-> 2 <-> 4\` | - |
| 4 | \`insertAfter(2, 3)\` | \`1 <-> 2 <-> 3 <-> 4\` | \`true\` |
| 5 | \`delete(1)\` | \`2 <-> 3 <-> 4\` (head moves to 2) | \`true\` |
| 6 | \`delete(4)\` | \`2 <-> 3\` (tail moves to 3) | \`true\` |
| 7 | \`toArray()\` | unchanged | \`[2, 3]\` |
| 8 | \`toArrayReverse()\` | unchanged | \`[3, 2]\` |

In step 4, \`curr\` stops at node \`2\`. The new node \`3\` gets \`prev = 2\` and \`next = 4\`; then \`4.prev\` is set to \`3\` and finally \`2.next\` is set to \`3\`. In step 5 the node \`1\` has no \`prev\`, so the code takes the "deleting the head" branch.

## Complexity

| Operation | Time | Space | Why |
|-----------|------|-------|-----|
| insertHead / insertTail | O(1) | O(1) | \`head\` and \`tail\` give direct access to both ends |
| insertAfter / delete (by value) | O(n) | O(1) | The scan for the value dominates; the relinking is O(1) |
| delete (given the node) | O(1) | O(1) | \`prev\` removes the need for a predecessor search |
| toArray / toArrayReverse | O(n) | O(n) | Each node is visited once and copied to the output |

## When to use it

- Perfect for deque-style access (both ends O(1)), LRU caches (unlink a node in O(1)) and browser history (back/forward).
- vs. **singly linked**: extra memory per node and more pointers to fix, but deleting a known node and walking backwards are cheap.
- vs. **array**: no shifting on insert/delete, but no random access and worse cache behaviour.

## Common pitfalls

- Fixing only one direction (setting \`next\` but forgetting \`prev\`) leaves a list that traverses fine forwards and breaks backwards.
- Forgetting the edge cases: empty list, single node, deleting the head, deleting the tail.
- Forgetting to move \`tail\` when inserting after the last node or deleting it.
- Updating pointers in the wrong order and losing a reference (read \`curr.next\` before overwriting it).

## What to watch in the visualizer

- The \`this.head\` list: \`prev\` arrows are drawn as well as \`next\` arrows, so you can check that each pair of neighbours points at each other.
- The \`curr\` pointer scanning from the head in \`insertAfter\` and \`delete\`.
- \`this.head\` and \`this.tail\` jumping when the first or last node changes.

## Example

\`\`\`
Input:  ops = [insertTail(2), insertHead(1), insertTail(4), insertAfter(2, 3), delete(1), delete(4), toArray(), toArrayReverse()]
Output: [null, null, null, true, true, true, [2, 3], [3, 2]]
\`\`\`
`;

export function buildDoublyLinkedList(): QuestionInput {
  return {
    slug: "doubly-linked-list",
    title: "Doubly Linked List",
    difficulty: "Easy",
    tags: ["linked-list", "doubly", "insertion", "deletion", "traversal"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        ops: ["DoublyLinkedList", "insertTail", "insertHead", "insertTail", "insertAfter", "delete", "delete", "toArray", "toArrayReverse"],
        args: [[], [2], [1], [4], [2, 3], [1], [4], [], []],
        expected: [null, null, null, null, true, true, true, [2, 3], [3, 2]],
      },
      {
        ops: ["DoublyLinkedList", "delete", "insertHead", "delete", "toArray", "toArrayReverse", "insertAfter"],
        args: [[], [1], [1], [1], [], [], [5, 2]],
        expected: [null, false, null, true, [], [], false],
      },
      {
        ops: ["DoublyLinkedList", "insertTail", "insertAfter", "insertAfter", "delete", "toArray", "toArrayReverse"],
        args: [[], [1], [1, 2], [2, 3], [2], [], []],
        expected: [null, null, true, true, true, [1, 3], [3, 1]],
      },
    ],
    visualHints: { "this.head": "linkedlist" },
  };
}
