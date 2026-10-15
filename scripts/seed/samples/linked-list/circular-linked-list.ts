import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class CircularLinkedList {
  // We keep only \`tail\`; the head is always tail.next.
  constructor() {
    this.tail = null;
  }

  // Append at the end: the new node becomes the tail.
  insert(value) {
    const node = new ListNode(value);
    if (this.tail === null) {
      node.next = node; // a single node points at itself
    } else {
      node.next = this.tail.next; // new tail points back at the head
      this.tail.next = node;
    }
    this.tail = node;
  }

  // Insert in front of the head: the tail does not change.
  insertHead(value) {
    const node = new ListNode(value);
    if (this.tail === null) {
      node.next = node;
      this.tail = node;
    } else {
      node.next = this.tail.next;
      this.tail.next = node;
    }
  }

  // Remove the first node holding \`value\`.
  delete(value) {
    if (this.tail === null) return false;
    let prev = this.tail;
    let curr = this.tail.next; // start at the head
    do {
      if (curr.val === value) {
        if (curr === prev) {
          this.tail = null; // it was the only node
        } else {
          prev.next = curr.next;
          if (curr === this.tail) this.tail = prev;
        }
        return true;
      }
      prev = curr;
      curr = curr.next;
    } while (curr !== this.tail.next); // stop after one full lap
    return false;
  }

  // Traversal must stop when we are back at the head, never at null.
  toArray() {
    const values = [];
    if (this.tail === null) return values;
    const head = this.tail.next;
    let curr = head;
    do {
      values.push(curr.val);
      curr = curr.next;
    } while (curr !== head);
    return values;
  }
}
`;

const DESCRIPTION = `A **circular linked list** is a linked list whose last node points back to the first instead of to \`null\`, so following \`next\` pointers goes around in a loop forever. It models naturally cyclic data (round-robin scheduling, a ring buffer, a playlist on repeat). This sample stores only a \`tail\` pointer, because \`tail.next\` is the head, which makes both ends reachable in O(1).

## Intuition

Picture people sitting around a table passing a ball: there is no "end", you just know who you started with. To avoid going around forever you must remember where you started and stop when you are back there.

Keeping the **tail** instead of the head is a classic trick: \`tail.next\` is the head, so you can add at the front (\`insertHead\`) and at the back (\`insert\`) without any traversal. The invariant is: following \`next\` from any node returns to that node after exactly \`size\` steps, and \`tail.next\` is the head.

## How it works

1. **insert(value)** (append): in an empty list the new node points at itself and becomes \`tail\`. Otherwise the new node copies \`tail.next\` (the head), the old tail points at the new node, and the new node becomes \`tail\`.
2. **insertHead(value)**: the same relinking as \`insert\`, but \`tail\` is not moved, so the new node ends up right after the tail, which is the new head.
3. **delete(value)**: start with \`prev = tail\` and \`curr = head\` and walk with a \`do ... while (curr !== head)\` loop. When \`curr\` matches: if \`curr === prev\` it was the only node, so the list becomes empty; otherwise bypass it with \`prev.next = curr.next\`, and if it was the tail, move \`tail\` back to \`prev\`.
4. **toArray()**: remember \`head = tail.next\`, then \`do { collect; curr = curr.next } while (curr !== head)\`.

## Walkthrough

Test case 0 (the arrow back from the tail to the head is shown as \`(back to head)\`):

| # | Operation | List after (head ... tail) | Returns |
|---|-----------|----------------------------|---------|
| 1 | \`insert(1)\` | \`1\`, 1 points at itself | - |
| 2 | \`insert(2)\` | \`1 -> 2 (back to 1)\`, tail = 2 | - |
| 3 | \`insert(3)\` | \`1 -> 2 -> 3 (back to 1)\`, tail = 3 | - |
| 4 | \`insertHead(0)\` | \`0 -> 1 -> 2 -> 3 (back to 0)\`, tail still 3 | - |
| 5 | \`delete(3)\` | \`0 -> 1 -> 2 (back to 0)\`, tail moves to 2 | \`true\` |
| 6 | \`delete(0)\` | \`1 -> 2 (back to 1)\`, \`prev\` (the tail) now points at 1 | \`true\` |
| 7 | \`toArray()\` | unchanged | \`[1, 2]\` |

In step 5 \`curr\` walks 0, 1, 2, 3 and \`prev\` trails it; at \`curr = 3\` it matches, \`prev.next = curr.next\` makes 2 point at 0, and because \`curr === this.tail\` the tail becomes 2.

## Complexity

| Operation | Time | Space | Why |
|-----------|------|-------|-----|
| insert / insertHead | O(1) | O(1) | \`tail\` and \`tail.next\` give direct access to both ends |
| delete | O(n) | O(1) | At most one lap to find the value |
| toArray | O(n) | O(n) | One lap, collecting every value |

## When to use it

- Round-robin schedulers, multiplayer turn order, repeating playlists, circular buffers: anywhere "after the last comes the first".
- You can reach every node from any node, which a singly linked list cannot offer.
- vs. a plain singly linked list: the same memory, but traversal loops need a different termination test and bugs become infinite loops instead of crashes.

## Common pitfalls

- **Never traverse with \`while (curr !== null)\`**: no node's \`next\` is ever \`null\` in a non-empty circular list, so that loop never ends. Stop when you return to the starting node.
- Using a plain \`while (curr !== head)\` loop skips everything on the first check because \`curr\` starts at \`head\`; use \`do ... while\` (or step first and compare afterwards).
- Forgetting the single-node case: its \`next\` must point at itself, and deleting it must reset \`tail\` to \`null\`.
- Forgetting to move \`tail\` when the deleted node was the tail.
- Forgetting to close the ring after inserting at the end (\`node.next\` must point at the head).

## What to watch in the visualizer

- The \`this.tail\` structure: the last arrow loops back to the head node (the visualizer marks the cycle).
- \`prev\` and \`curr\` chasing each other around the ring during \`delete\`, and the \`do ... while\` exit when \`curr\` returns to the head.
- \`this.tail\` moving only on \`insert\` and when the tail itself is deleted.

## Example

\`\`\`
Input:  ops = [insert(1), insert(2), insert(3), insertHead(0), delete(3), delete(0), toArray()]
Output: [null, null, null, null, true, true, [1, 2]]
\`\`\`
`;

export function buildCircularLinkedList(): QuestionInput {
  return {
    slug: "circular-linked-list",
    title: "Circular Linked List",
    difficulty: "Easy",
    tags: ["linked-list", "circular", "insertion", "deletion", "traversal"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        ops: ["CircularLinkedList", "insert", "insert", "insert", "insertHead", "delete", "delete", "toArray"],
        args: [[], [1], [2], [3], [0], [3], [0], []],
        expected: [null, null, null, null, null, true, true, [1, 2]],
      },
      {
        ops: ["CircularLinkedList", "delete", "toArray", "insert", "delete", "delete", "toArray"],
        args: [[], [1], [], [5], [9], [5], []],
        expected: [null, false, [], null, false, true, []],
      },
      {
        ops: ["CircularLinkedList", "insertHead", "insertHead", "insert", "delete", "toArray"],
        args: [[], [2], [1], [3], [2], []],
        expected: [null, null, null, null, true, [1, 3]],
      },
    ],
    visualHints: { "this.tail": "linkedlist" },
  };
}
