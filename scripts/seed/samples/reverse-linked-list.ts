import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `function reverseList(values) {
  let head = null;
  for (let i = values.length - 1; i >= 0; i--) {
    head = new ListNode(values[i], head);
  }
  let prev = null;
  let curr = head;
  while (curr !== null) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  const out = [];
  for (let node = prev; node !== null; node = node.next) out.push(node.val);
  return out;
}
`;

const DESCRIPTION = `Given the head of a singly linked list, reverse the list and return the new head.

Here the list is passed as an array of values; it is turned into nodes inside the function and the reversed values are returned as an array.

## Example

\`\`\`
Input: head = [1, 2, 3, 4, 5]
Output: [5, 4, 3, 2, 1]
\`\`\`

## Constraints

- \`0 <= list length <= 5000\`
- \`-5000 <= Node.val <= 5000\`
`;

export function buildReverseLinkedList(): QuestionInput {
  return {
    slug: "reverse-linked-list",
    title: "Reverse Linked List",
    difficulty: "Easy",
    tags: ["linked-list"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "reverseList", args: [[1, 2, 3, 4, 5]], expected: [5, 4, 3, 2, 1] },
      { method: "reverseList", args: [[1, 2]], expected: [2, 1] },
      { method: "reverseList", args: [[]], expected: [] },
    ],
    visualHints: {},
  };
}
