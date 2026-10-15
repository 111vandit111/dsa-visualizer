import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `function inorderTraversal(values) {
  const root = buildTree(values);
  const result = [];
  const stack = [];

  // The explicit stack replaces the recursion's call stack.
  let curr = root;
  while (curr !== null || stack.length > 0) {
    // 1. Go as far left as possible, remembering the path.
    while (curr !== null) {
      stack.push(curr);
      curr = curr.left;
    }
    // 2. The top of the stack is the next node in sorted order.
    curr = stack.pop();
    result.push(curr.val);
    // 3. Then explore its right subtree.
    curr = curr.right;
  }
  return result;
}

// Build a binary tree from a level-order array (null = missing child).
function buildTree(values) {
  const nodes = values.map((v) => (v === null ? null : new TreeNode(v)));
  let next = 1;
  for (const node of nodes) {
    if (node === null) continue;
    if (next < nodes.length) node.left = nodes[next++];
    if (next < nodes.length) node.right = nodes[next++];
  }
  return nodes.length > 0 ? nodes[0] : null;
}
`;

const DESCRIPTION = `**Inorder traversal** visits the left subtree, then the node, then the right subtree. On a binary search tree it produces the values in **sorted order**. This sample uses the iterative form with an explicit \`stack\` instead of recursion, which makes the hidden call stack visible. The tree is passed as a level-order array and built into nodes inside the function.

## Intuition

To print a tree "left to right" you must go all the way to the leftmost node first, but you have to remember the way back. Recursion remembers it in the call stack; here we remember it ourselves in \`stack\`. Every node pushed onto the stack is a promise: "come back to me after my left subtree is done".

Invariant: the top of the stack is always the next node to be visited, and everything below it is an ancestor waiting for its turn. Popping a node means its entire left subtree has already been visited, so it is time to record it and then handle its right subtree.

## How it works

1. Start with \`curr = root\` and an empty \`stack\`.
2. Repeat while \`curr\` is not \`null\` **or** the stack is not empty:
   1. Walk left: push \`curr\` and move to \`curr.left\` until \`curr\` is \`null\`.
   2. Pop the top of the stack into \`curr\` and record \`curr.val\`.
   3. Move to \`curr.right\` (it may be \`null\`, in which case the next iteration pops an ancestor).
3. When both \`curr\` and the stack are empty, every node has been visited.

## Walkthrough

Test case 0, tree \`[1, 2, 3, 4, 5, null, 6]\`:

\`\`\`
        1
       / \\
      2   3
     / \\   \\
    4   5   6
\`\`\`

| Action | \`stack\` (bottom to top) | \`result\` |
|--------|-------------------------|----------|
| push 1, push 2, push 4 (walk left) | \`[1, 2, 4]\` | \`[]\` |
| pop 4, record, go right (null) | \`[1, 2]\` | \`[4]\` |
| pop 2, record, go right to 5 | \`[1]\` | \`[4, 2]\` |
| push 5 (5 has no left child) | \`[1, 5]\` | \`[4, 2]\` |
| pop 5, record, go right (null) | \`[1]\` | \`[4, 2, 5]\` |
| pop 1, record, go right to 3 | \`[]\` | \`[4, 2, 5, 1]\` |
| push 3, pop 3, record, go right to 6 | \`[]\` | \`[4, 2, 5, 1, 3]\` |
| push 6, pop 6, record, go right (null) | \`[]\` | \`[4, 2, 5, 1, 3, 6]\` |

## Complexity

| Measure | Cost | Why |
|---------|------|-----|
| Time | O(n) | Each node is pushed once and popped once |
| Space | O(h) | The stack holds at most one root-to-node path: O(log n) if balanced, O(n) for a chain |

## When to use it

- Getting the sorted sequence out of a BST, finding the k-th smallest element, or validating a BST (the sequence must be strictly increasing).
- Use the iterative form when recursion depth could overflow, or when you need to pause and resume the traversal (an iterator).
- If even O(h) space is too much, see **Morris traversal**, which does the same walk in O(1) extra space.

## Common pitfalls

- A loop condition of only \`while (curr !== null)\` stops early: after popping a node whose right child is \`null\`, \`curr\` is \`null\` but the stack still holds ancestors.
- Recording the node when pushing it (that is preorder) instead of when popping it.
- Forgetting to move to \`curr.right\` after recording, which loops on the same node forever.
- Assuming the output is sorted: it only is for a valid BST. This sample's tree is not a BST, so the output is just inorder.

## What to watch in the visualizer

- The \`stack\` variable: it grows during the "walk left" phase and shrinks on each pop.
- The \`curr\` pointer on the tree jumping from a popped node to its right child.
- \`result\` gaining a value on every pop.

## Example

\`\`\`
Input:  root = [1, 2, 3, 4, 5, null, 6]
Output: [4, 2, 5, 1, 3, 6]
\`\`\`
`;

export function buildInorderTraversal(): QuestionInput {
  return {
    slug: "inorder-traversal",
    title: "Inorder Traversal",
    difficulty: "Easy",
    tags: ["tree", "traversal", "dfs", "stack", "bst"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        method: "inorderTraversal",
        args: [[1, 2, 3, 4, 5, null, 6]],
        expected: [4, 2, 5, 1, 3, 6],
      },
      {
        method: "inorderTraversal",
        args: [[1, null, 2, 3]],
        expected: [1, 3, 2],
      },
      {
        method: "inorderTraversal",
        args: [[4, 2, 6, 1, 3, 5, 7]],
        expected: [1, 2, 3, 4, 5, 6, 7],
      },
      {
        method: "inorderTraversal",
        args: [[]],
        expected: [],
      },
    ],
    visualHints: { root: "tree" },
  };
}
