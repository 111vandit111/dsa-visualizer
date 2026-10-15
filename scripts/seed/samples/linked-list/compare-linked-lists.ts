import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `// Returns -1 if list1 < list2, 0 if they are equal, 1 if list1 > list2
// (lexicographic order, like comparing words letter by letter).
function compareLists(values1, values2) {
  const list1 = buildList(values1);
  const list2 = buildList(values2);

  let curr1 = list1;
  let curr2 = list2;
  while (curr1 !== null && curr2 !== null) {
    if (curr1.val < curr2.val) return -1;
    if (curr1.val > curr2.val) return 1;
    // Equal so far: move both pointers one node forward.
    curr1 = curr1.next;
    curr2 = curr2.next;
  }

  // One list ran out first (or both did).
  if (curr1 === null && curr2 === null) return 0; // same length, all equal
  if (curr1 === null) return -1; // list1 is a shorter prefix of list2
  return 1; // list2 is a shorter prefix of list1
}

function buildList(values) {
  let head = null;
  for (let i = values.length - 1; i >= 0; i--) {
    head = new ListNode(values[i], head);
  }
  return head;
}
`;

const DESCRIPTION = `Compare two linked lists node by node and return \`-1\` if the first is smaller, \`0\` if they are equal and \`1\` if the first is larger, using lexicographic (dictionary) order. The same walk answers the plain **equality** question: two lists are equal exactly when the result is \`0\`. The lists are passed as arrays and built into nodes inside the function.

## Intuition

Comparing two words: look at the first letters; if they differ, that decides it. If they match, move to the second letters, and so on. If one word runs out while the other still has letters, the shorter word comes first ("car" < "card"). Linked lists work the same way, with one pointer walking each list in lock-step.

Because a linked list has no length field and no random access, you cannot jump to the end or compare sizes cheaply. The synchronized walk is therefore the natural algorithm: it finds the first position where the lists differ, or discovers that one list ends first.

## How it works

1. Put \`curr1\` on the head of the first list and \`curr2\` on the head of the second.
2. While both pointers are non-null, compare their values:
   - \`curr1.val < curr2.val\`: return \`-1\`.
   - \`curr1.val > curr2.val\`: return \`1\`.
   - Otherwise advance both pointers.
3. When the loop exits at least one pointer is \`null\`:
   - both \`null\`: same length and every value matched, return \`0\` (equal);
   - only \`curr1\` is \`null\`: the first list is a prefix of the second, return \`-1\`;
   - only \`curr2\` is \`null\`: return \`1\`.

## Walkthrough

Test case 0: \`list1 = 1 -> 2 -> 3\`, \`list2 = 1 -> 2 -> 4\`.

| Step | \`curr1.val\` | \`curr2.val\` | Decision |
|------|-------------|-------------|----------|
| 1 | 1 | 1 | equal, advance both |
| 2 | 2 | 2 | equal, advance both |
| 3 | 3 | 4 | \`3 < 4\`, return \`-1\` |

Other cases: \`[1, 2, 3]\` vs \`[1, 2, 3]\` runs out of nodes together and returns \`0\`; \`[1, 2]\` vs \`[1, 2, 3]\` ends with \`curr1 === null\` and returns \`-1\`.

## Complexity

| Measure | Cost | Why |
|---------|------|-----|
| Time | O(min(n, m)) | The walk stops at the first difference or when the shorter list ends |
| Space | O(1) | Two pointers (the arrays only exist to build the demo lists) |

## When to use it

- Checking whether two lists hold the same sequence (\`result === 0\`), or ordering lists lexicographically, for example when sorting a list of lists.
- If you only need equality and you know both lengths, compare lengths first for an early exit; with plain linked lists the lengths are unknown, so the walk is the cheapest way.
- Comparing the **nodes' identity** (\`curr1 === curr2\`) is a different question: it tests whether two lists share a node, not whether their values are equal.

## Common pitfalls

- Comparing only while both lists have nodes and then forgetting the length check, which wrongly reports \`[1, 2]\` and \`[1, 2, 3]\` as equal.
- Dereferencing \`curr1.val\` after \`curr1\` has become \`null\`; check both pointers in the loop condition.
- Comparing nodes (\`curr1 === curr2\`) instead of values (\`curr1.val === curr2.val\`).
- Mixing up which empty list is smaller: the shorter prefix is the smaller one, so an empty list is smaller than any non-empty list.

## What to watch in the visualizer

- \`curr1\` and \`curr2\` moving forward in step along their own lists.
- The two list views side by side: the loop stops at the first position where the values differ, or when a pointer reaches \`null\`.
- The return line that fires, which tells you whether it was a value difference, equal lists or a length difference.

## Example

\`\`\`
Input:  list1 = [1, 2, 3], list2 = [1, 2, 4]
Output: -1
\`\`\`
`;

export function buildCompareLinkedLists(): QuestionInput {
  return {
    slug: "compare-linked-lists",
    title: "Compare Two Linked Lists",
    difficulty: "Easy",
    tags: ["linked-list", "two-pointers", "comparison"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        method: "compareLists",
        args: [[1, 2, 3], [1, 2, 4]],
        expected: -1,
      },
      {
        method: "compareLists",
        args: [[1, 2, 3], [1, 2, 3]],
        expected: 0,
      },
      {
        method: "compareLists",
        args: [[1, 2], [1, 2, 3]],
        expected: -1,
      },
      {
        method: "compareLists",
        args: [[5, 1], [3, 9, 9]],
        expected: 1,
      },
    ],
    visualHints: {},
  };
}
