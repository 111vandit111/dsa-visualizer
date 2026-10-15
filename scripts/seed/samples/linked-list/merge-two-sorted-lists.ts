import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `function mergeTwoLists(values1, values2) {
  const list1 = buildList(values1);
  const list2 = buildList(values2);

  // The dummy head removes the "is the result empty yet?" special case.
  const dummy = new ListNode(0);
  let tail = dummy;

  let a = list1;
  let b = list2;
  while (a !== null && b !== null) {
    // Splice the smaller node onto the end of the result.
    if (a.val <= b.val) {
      tail.next = a;
      a = a.next;
    } else {
      tail.next = b;
      b = b.next;
    }
    tail = tail.next;
  }

  // At most one list still has nodes: attach it whole.
  tail.next = a !== null ? a : b;

  const out = [];
  for (let curr = dummy.next; curr !== null; curr = curr.next) {
    out.push(curr.val);
  }
  return out;
}

function buildList(values) {
  let head = null;
  for (let i = values.length - 1; i >= 0; i--) {
    head = new ListNode(values[i], head);
  }
  return head;
}
`;

const DESCRIPTION = `Merge two sorted linked lists into one sorted list by relinking their existing nodes. The lists are passed as arrays, turned into nodes inside the function, and the merged values are returned as an array. This is the "merge" step of merge sort, performed on linked lists.

## Intuition

Imagine two sorted piles of cards face up. Repeatedly take the smaller top card of the two piles and append it to a growing result row. When one pile is empty, the rest of the other pile is already sorted, so it can be placed on the row in one move.

On linked lists the "row" is built with a \`tail\` pointer that always sits on the last node of the result. A **dummy head** node placed before the real result means the very first append needs no special case: \`tail.next = ...\` always works, and the answer is \`dummy.next\`.

Invariant: the nodes from \`dummy.next\` to \`tail\` are sorted and are all smaller than or equal to every node still left in \`a\` and \`b\`.

## How it works

1. Create \`dummy = new ListNode(0)\` and set \`tail = dummy\`.
2. Put one pointer on each list: \`a\` and \`b\`.
3. While both pointers are non-null: link the smaller node (\`a.val <= b.val\` picks \`a\`, which keeps the merge stable) after \`tail\`, advance that list's pointer, and move \`tail\` forward.
4. When the loop ends, at most one list has nodes left: set \`tail.next\` to it (no copying needed).
5. Return \`dummy.next\`.

## Walkthrough

Test case 0: \`list1 = 1 -> 3 -> 5\`, \`list2 = 2 -> 4\`.

| Step | \`a\` | \`b\` | Compare | Result so far |
|------|-----|-----|---------|---------------|
| start | 1 | 2 | - | \`dummy\` |
| 1 | 1 | 2 | 1 <= 2, take \`a\` | \`1\` |
| 2 | 3 | 2 | 3 > 2, take \`b\` | \`1 -> 2\` |
| 3 | 3 | 4 | 3 <= 4, take \`a\` | \`1 -> 2 -> 3\` |
| 4 | 5 | 4 | 5 > 4, take \`b\` | \`1 -> 2 -> 3 -> 4\` |
| end | 5 | null | loop stops | attach the rest: \`... -> 4 -> 5\` |

The result is \`[1, 2, 3, 4, 5]\`.

## Complexity

| Measure | Cost | Why |
|---------|------|-----|
| Time | O(n + m) | Each node of both lists is visited at most once |
| Space | O(1) | Only a few pointers; the nodes are reused, not copied (the output array is for display) |

## When to use it

- The core of **merge sort** on linked lists, and a building block for "merge k sorted lists".
- Because it only relinks nodes, it needs no extra memory, unlike merging arrays which needs a new array.
- A recursive version is shorter but uses O(n + m) stack; the iterative dummy-head version is safer for long lists.

## Common pitfalls

- Forgetting to advance \`tail\` after each append, so every new node overwrites the previous one.
- Using \`<\` instead of \`<=\`, which still sorts but makes the merge unstable for equal values.
- Forgetting to attach the leftover list after the loop (the result would be cut short).
- Returning \`dummy\` instead of \`dummy.next\` (an extra leading \`0\`).
- Not handling an empty input: with the dummy head and the leftover step it works with no extra code.

## What to watch in the visualizer

- The pointers \`a\`, \`b\` and \`tail\`: \`a\` and \`b\` creep forward through their lists while \`tail\` extends the result.
- The \`dummy\` list view growing node by node, with \`tail\` always on its last node.
- The final \`tail.next = ...\` line: it attaches the remaining nodes in one pointer write.

## Example

\`\`\`
Input:  list1 = [1, 3, 5], list2 = [2, 4]
Output: [1, 2, 3, 4, 5]
\`\`\`
`;

export function buildMergeTwoSortedLists(): QuestionInput {
  return {
    slug: "merge-two-sorted-lists",
    title: "Merge Two Sorted Lists",
    difficulty: "Easy",
    tags: ["linked-list", "two-pointers", "merge", "dummy-head"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        method: "mergeTwoLists",
        args: [[1, 3, 5], [2, 4]],
        expected: [1, 2, 3, 4, 5],
      },
      {
        method: "mergeTwoLists",
        args: [[], [0]],
        expected: [0],
      },
      {
        method: "mergeTwoLists",
        args: [[1, 1, 4], [1, 3, 4]],
        expected: [1, 1, 1, 3, 4, 4],
      },
      {
        method: "mergeTwoLists",
        args: [[], []],
        expected: [],
      },
    ],
    visualHints: {},
  };
}
