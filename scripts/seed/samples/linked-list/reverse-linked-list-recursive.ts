import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `function reverseListRecursive(values) {
  // Build the list 1 -> 2 -> 3 ... from the input array.
  let head = null;
  let tail = null;
  for (let i = 0; i < values.length; i++) {
    const node = new ListNode(values[i]);
    if (head === null) {
      head = node;
    } else {
      tail.next = node;
    }
    tail = node;
  }

  const newHead = reverse(head);

  const out = [];
  for (let curr = newHead; curr !== null; curr = curr.next) {
    out.push(curr.val);
  }
  return out;
}

// Reverses the list starting at \`node\` and returns its new head.
function reverse(node) {
  // Base case: empty list or a single node is already reversed.
  if (node === null || node.next === null) return node;

  // Trust the recursion: reverse everything after \`node\`.
  const newHead = reverse(node.next);

  // node.next is now the TAIL of the reversed part; point it back at node.
  node.next.next = node;
  // node becomes the new tail, so cut its old forward link.
  node.next = null;

  return newHead;
}
`;

const DESCRIPTION = `Reverse a singly linked list **recursively**: given the head of a list, return the head of the same nodes in reverse order, by reversing the tail of the list first and then attaching the current node at the end. The list is passed as an array, built into nodes inside the function, and the reversed values are returned as an array.

## Intuition

Solve the problem for a smaller list and extend the answer by one. To reverse \`1 -> 2 -> 3 -> 4\`, ask the recursion to reverse \`2 -> 3 -> 4\`. It hands back \`4 -> 3 -> 2\`, where node \`2\` is now the *last* node. The only thing left is to put \`1\` after \`2\`: since \`1.next\` still points at \`2\`, we can write \`1.next.next = 1\`, and finally cut \`1.next = null\` so \`1\` is the new tail.

The invariant: \`reverse(node)\` always returns the head of the reversed sublist, and afterwards the original \`node\` is that sublist's tail. The base case is a list with zero or one node, which is already its own reverse.

## How it works

1. If \`node\` is \`null\` or \`node.next\` is \`null\`, return \`node\` (base case).
2. Recurse: \`newHead = reverse(node.next)\`. After this call the sublist after \`node\` is reversed and \`node.next\` still points at its last node.
3. Reverse the single link between them: \`node.next.next = node\`.
4. Cut the old forward pointer: \`node.next = null\` (otherwise \`node\` and its successor would point at each other and form a cycle).
5. Return \`newHead\` unchanged all the way up; it is the original last node.

## Walkthrough

Test case 0, \`values = [1, 2, 3, 4]\` (the call stack grows to 4 frames):

\`\`\`
reverse(1) -> reverse(2) -> reverse(3) -> reverse(4)
reverse(4): 4.next is null -> returns 4          (newHead = 4)
reverse(3): newHead = 4; 3.next.next = 3 => 4 -> 3; 3.next = null   list: 4 -> 3
reverse(2): newHead = 4; 2.next.next = 2 => 3 -> 2; 2.next = null   list: 4 -> 3 -> 2
reverse(1): newHead = 4; 1.next.next = 1 => 2 -> 1; 1.next = null   list: 4 -> 3 -> 2 -> 1
\`\`\`

The function then walks from \`newHead\` and returns \`[4, 3, 2, 1]\`.

## Complexity

| Measure | Cost | Why |
|---------|------|-----|
| Time | O(n) | Each node is handled once on the way back up |
| Space | O(n) | The recursion depth equals the list length (call stack) |

## When to use it

- Great for understanding recursion on linked structures and for interviews that ask for both versions.
- The **iterative** version (\`prev\`, \`curr\`, \`next\`) does the same in O(1) extra space, so prefer it for long lists; a very long list can overflow the call stack here.

## Common pitfalls

- Forgetting \`node.next = null\`: this leaves a cycle between the last two nodes of the result (the original first two, which point at each other) and any later traversal never ends.
- Using \`node.next\` after it has been overwritten; the order \`node.next.next = node\` then \`node.next = null\` matters.
- Returning \`node\` instead of \`newHead\` at the end (that returns the old head, which is now the tail).
- Missing the single-node base case (\`node.next === null\`), which makes the recursion dereference \`null\`.

## What to watch in the visualizer

- The call stack panel: the frames pile up to the tail (\`reverse(4)\`) and then unwind one at a time.
- In each unwinding frame, watch \`node\` and \`newHead\`: \`newHead\` never changes while \`node\` walks back toward the original head.
- The list view: arrows flip one link per returning frame, and the last frame cuts the original head's pointer to \`null\`.

## Example

\`\`\`
Input:  head = [1, 2, 3, 4]
Output: [4, 3, 2, 1]
\`\`\`
`;

export function buildReverseLinkedListRecursive(): QuestionInput {
  return {
    slug: "reverse-linked-list-recursive",
    title: "Reverse Linked List (Recursive)",
    difficulty: "Easy",
    tags: ["linked-list", "recursion", "reverse"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        method: "reverseListRecursive",
        args: [[1, 2, 3, 4]],
        expected: [4, 3, 2, 1],
      },
      {
        method: "reverseListRecursive",
        args: [[7]],
        expected: [7],
      },
      {
        method: "reverseListRecursive",
        args: [[]],
        expected: [],
      },
      {
        method: "reverseListRecursive",
        args: [[5, 6]],
        expected: [6, 5],
      },
    ],
    visualHints: {},
  };
}
