import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `function postorderTraversal(values) {
  const root = buildTree(values);
  const result = [];

  // Postorder: left subtree, right subtree, and the node itself LAST.
  function visit(node) {
    if (node === null) return;
    visit(node.left);
    visit(node.right);
    result.push(node.val);
  }

  visit(root);
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

const DESCRIPTION = `**Postorder traversal** visits the left subtree, then the right subtree, and the node itself **last**. Every node is therefore processed after all its descendants, which is exactly what you need to delete a tree, compute sizes/heights bottom-up, or evaluate an expression tree. The tree is passed as a level-order array and built into nodes inside the function.

## Intuition

Think of packing boxes that contain smaller boxes: you must pack (and close) the inner boxes before you can close the outer one. Postorder encodes that "children first, parent last" rule, and the root is always the final value.

Why it works: \`visit(node)\` recurses into both children before it records \`node.val\`, so by the time a node is recorded, its whole subtree is already in \`result\`.

## How it works

1. If \`node\` is \`null\`, return.
2. Recurse on \`node.left\`.
3. Recurse on \`node.right\`.
4. Record \`node.val\`.
5. Start with \`visit(root)\`.

**Two-stack iterative variant (not in the code):** run a modified preorder (node, right, left) using \`stack1\`, but instead of recording a node, push it onto \`stack2\`. Pop \`stack1\`, push the node onto \`stack2\`, then push its left child and its right child onto \`stack1\`. At the end, popping \`stack2\` yields the nodes in left, right, node order, because reversing "node, right, left" gives "left, right, node". A one-stack variant tracks the last visited node to know when a node's right subtree is finished.

## Walkthrough

Test case 0, tree \`[1, 2, 3, 4, 5, null, 6]\`:

\`\`\`
        1
       / \\
      2   3
     / \\   \\
    4   5   6
\`\`\`

| Event | \`result\` |
|-------|----------|
| \`visit(1)\` -> \`visit(2)\` -> \`visit(4)\`: both children null, record 4 | \`[4]\` |
| back in 2, \`visit(5)\`: record 5 | \`[4, 5]\` |
| both children of 2 done, record 2 | \`[4, 5, 2]\` |
| back in 1, \`visit(3)\`: left is null, \`visit(6)\` records 6 | \`[4, 5, 2, 6]\` |
| record 3 | \`[4, 5, 2, 6, 3]\` |
| record 1 (the root, last) | \`[4, 5, 2, 6, 3, 1]\` |

## Complexity

| Measure | Cost | Why |
|---------|------|-----|
| Time | O(n) | Every node is visited once |
| Space | O(h) | Recursion depth equals the tree height: O(log n) balanced, O(n) for a chain (the two-stack variant uses O(n)) |

## When to use it

- Deleting or freeing a tree (children must go before the parent), computing height, size or diameter, evaluating postfix expression trees.
- vs. **preorder**: preorder is top-down (parents first); postorder is bottom-up (children first).
- vs. **inorder**: inorder gives sorted order for a BST but does not guarantee "children before parent".

## Common pitfalls

- Recording the node before the recursive calls (that is preorder) or between them (that is inorder).
- Reversing the answer of a "node, right, left" walk but forgetting to visit the children in that order.
- In the one-stack iterative version, forgetting to track the previous node and visiting a parent twice.
- Deep chains can overflow the recursion stack.

## What to watch in the visualizer

- The call stack: frames only return (and record) after both child calls have returned.
- \`result\` never starts with the root; the root appears last.
- Leaves are recorded the moment they are reached, since both of their children are \`null\`.

## Example

\`\`\`
Input:  root = [1, 2, 3, 4, 5, null, 6]
Output: [4, 5, 2, 6, 3, 1]
\`\`\`
`;

export function buildPostorderTraversal(): QuestionInput {
  return {
    slug: "postorder-traversal",
    title: "Postorder Traversal",
    difficulty: "Easy",
    tags: ["tree", "traversal", "dfs", "recursion"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        method: "postorderTraversal",
        args: [[1, 2, 3, 4, 5, null, 6]],
        expected: [4, 5, 2, 6, 3, 1],
      },
      {
        method: "postorderTraversal",
        args: [[1, null, 2, 3]],
        expected: [3, 2, 1],
      },
      {
        method: "postorderTraversal",
        args: [[]],
        expected: [],
      },
      {
        method: "postorderTraversal",
        args: [[7]],
        expected: [7],
      },
    ],
    visualHints: { root: "tree" },
  };
}
