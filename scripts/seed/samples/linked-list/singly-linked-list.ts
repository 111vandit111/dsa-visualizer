import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class SinglyLinkedList {
  constructor() {
    this.head = null;
    this.size = 0;
  }

  // Insertion: O(1), the new node simply points at the old head.
  insertHead(value) {
    const node = new ListNode(value, this.head);
    this.head = node;
    this.size++;
  }

  // Insertion: O(n), walk to the last node and link the new one after it.
  insertTail(value) {
    const node = new ListNode(value);
    if (this.head === null) {
      this.head = node;
    } else {
      let curr = this.head;
      while (curr.next !== null) {
        curr = curr.next;
      }
      curr.next = node;
    }
    this.size++;
  }

  // Insertion at a position: stop one node BEFORE the position (prev).
  insertAt(index, value) {
    if (index < 0 || index > this.size) return false;
    if (index === 0) {
      this.insertHead(value);
      return true;
    }
    let prev = this.head;
    for (let i = 0; i < index - 1; i++) {
      prev = prev.next;
    }
    prev.next = new ListNode(value, prev.next);
    this.size++;
    return true;
  }

  // Deletion by value: remember prev so we can bypass curr.
  deleteValue(value) {
    let prev = null;
    let curr = this.head;
    while (curr !== null && curr.val !== value) {
      prev = curr;
      curr = curr.next;
    }
    if (curr === null) return false;
    if (prev === null) {
      this.head = curr.next;
    } else {
      prev.next = curr.next;
    }
    this.size--;
    return true;
  }

  // Deletion by position: returns the removed value, or -1 if out of range.
  deleteAt(index) {
    if (index < 0 || index >= this.size) return -1;
    let removed;
    if (index === 0) {
      removed = this.head.val;
      this.head = this.head.next;
    } else {
      let prev = this.head;
      for (let i = 0; i < index - 1; i++) {
        prev = prev.next;
      }
      removed = prev.next.val;
      prev.next = prev.next.next;
    }
    this.size--;
    return removed;
  }

  // Searching: linear scan, returns the index of the first match or -1.
  search(value) {
    let curr = this.head;
    let index = 0;
    while (curr !== null) {
      if (curr.val === value) return index;
      curr = curr.next;
      index++;
    }
    return -1;
  }

  // Traversal: visit every node once, head to tail.
  toArray() {
    const values = [];
    let curr = this.head;
    while (curr !== null) {
      values.push(curr.val);
      curr = curr.next;
    }
    return values;
  }
}
`;

const DESCRIPTION = `A **singly linked list** stores a sequence as a chain of nodes, where each node holds a value and a single \`next\` pointer to the following node. This sample implements the four classic operations on it: **traversal**, **insertion** (at the head, tail or a position), **deletion** (by value or position) and **searching**.

## Intuition

Think of a treasure hunt: each clue (node) tells you the value and where to find the next clue. You only ever hold the first clue (\`head\`), so to reach the 4th one you must follow three pointers. Nothing is stored side by side in memory, so inserting or removing a node never shifts other elements; it only rewires one or two \`next\` pointers.

The invariant: starting at \`head\` and following \`next\` until \`null\` visits every element exactly once, in order. Every operation must leave that chain unbroken. The usual trick is to stop **one node early** (\`prev\`) so you can rewire \`prev.next\` before you lose the way forward.

## How it works

1. **insertHead(value)**: create a node whose \`next\` is the current head, then make it the new head. O(1).
2. **insertTail(value)**: if the list is empty the new node becomes \`head\`; otherwise walk with \`curr\` until \`curr.next === null\` and link the node after it.
3. **insertAt(index, value)**: reject indexes outside \`0..size\`; index 0 is \`insertHead\`; otherwise walk \`prev\` to node \`index - 1\`, then \`prev.next = new ListNode(value, prev.next)\`. The order matters: the new node captures the old \`prev.next\` first.
4. **deleteValue(value)**: walk \`curr\` while tracking \`prev\`. If \`curr\` is the head, move \`head\` forward; otherwise set \`prev.next = curr.next\`, bypassing \`curr\`.
5. **deleteAt(index)**: same bypass, but the target is found by counting. Returns the removed value, or -1 for a bad index.
6. **search(value)**: walk from \`head\`, counting the index, and return the first match (or -1).
7. **toArray()**: traversal, collecting each \`val\`.

## Walkthrough

Test case 0 (state of the list after each operation):

| # | Operation | List after | Returns |
|---|-----------|-----------|---------|
| 1 | \`insertTail(2)\` | \`2\` | - |
| 2 | \`insertTail(3)\` | \`2 -> 3\` | - |
| 3 | \`insertHead(1)\` | \`1 -> 2 -> 3\` | - |
| 4 | \`insertAt(2, 9)\` | \`1 -> 2 -> 9 -> 3\` | \`true\` |
| 5 | \`search(9)\` | unchanged | \`2\` |
| 6 | \`deleteValue(2)\` | \`1 -> 9 -> 3\` | \`true\` |
| 7 | \`deleteAt(0)\` | \`9 -> 3\` | \`1\` |
| 8 | \`toArray()\` | unchanged | \`[9, 3]\` |

In step 4, \`prev\` stops at the node \`2\` (index 1). The new node \`9\` is created pointing at \`3\`, and only then does \`2.next\` switch to \`9\`. In step 6 the list is \`1 -> 2 -> 9 -> 3\`: \`prev\` is node \`1\` and \`curr\` is node \`2\`, so \`prev.next = curr.next\` links \`1\` straight to \`9\` and node \`2\` is no longer reachable.

## Complexity

| Operation | Time | Space | Why |
|-----------|------|-------|-----|
| insertHead | O(1) | O(1) | No traversal, just two pointer writes |
| insertTail | O(n) | O(1) | Must walk to the last node (O(1) if you also keep a \`tail\` pointer) |
| insertAt / deleteAt | O(n) | O(1) | Walk to the position; the rewiring itself is O(1) |
| deleteValue / search | O(n) (best O(1)) | O(1) | Best case the value is at the head, worst case at the end or absent |
| toArray | O(n) | O(n) | Visits every node and builds the output array |

## When to use it

- Great when you insert or remove at the front often (stacks, undo history) or splice in the middle once you already hold a pointer.
- Weak at random access: there is no \`list[i]\`, reaching index i costs O(i). Arrays win for indexing and cache locality.
- vs. a **doubly linked list**: this one uses less memory per node but cannot step backwards, so deleting a node needs its predecessor.

## Common pitfalls

- Forgetting to update \`head\` when inserting or deleting at position 0.
- Dereferencing \`null\`: \`curr.next.next\` crashes when \`curr.next\` is \`null\`; check before walking.
- Rewiring in the wrong order (\`prev.next = node\` before \`node.next = prev.next\`) loses the rest of the list.
- Off-by-one when stopping at \`index - 1\` versus \`index\`.
- Forgetting to maintain \`size\` (or to allow \`index === size\` for appending).

## What to watch in the visualizer

- The \`this.head\` list view: watch nodes appear and \`next\` arrows being redrawn.
- The pointers \`curr\` and \`prev\` sliding along the chain, and \`prev\` always trailing \`curr\` during deletion.
- \`this.size\` changing by one on every successful insert or delete.

## Example

\`\`\`
Input:  ops = [insertTail(2), insertTail(3), insertHead(1), insertAt(2, 9), search(9), deleteValue(2), deleteAt(0), toArray()]
Output: [null, null, null, true, 2, true, 1, [9, 3]]
\`\`\`
`;

export function buildSinglyLinkedList(): QuestionInput {
  return {
    slug: "singly-linked-list",
    title: "Singly Linked List",
    difficulty: "Easy",
    tags: ["linked-list", "traversal", "insertion", "deletion", "searching"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        ops: ["SinglyLinkedList", "insertTail", "insertTail", "insertHead", "insertAt", "search", "deleteValue", "deleteAt", "toArray"],
        args: [[], [2], [3], [1], [2, 9], [9], [2], [0], []],
        expected: [null, null, null, null, true, 2, true, 1, [9, 3]],
      },
      {
        ops: ["SinglyLinkedList", "deleteValue", "search", "insertAt", "insertAt", "insertAt", "deleteAt", "toArray"],
        args: [[], [5], [5], [1, 7], [0, 7], [1, 8], [5], []],
        expected: [null, false, -1, false, true, true, -1, [7, 8]],
      },
      {
        ops: ["SinglyLinkedList", "insertHead", "insertHead", "insertTail", "deleteValue", "deleteValue", "search", "toArray"],
        args: [[], [3], [2], [4], [4], [2], [3], []],
        expected: [null, null, null, null, true, true, 0, [3]],
      },
    ],
    visualHints: { "this.head": "linkedlist" },
  };
}
