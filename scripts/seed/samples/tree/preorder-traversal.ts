import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `function preorderTraversal(values) {
  const root = buildTree(values);
  const result = [];

  // Preorder: visit the node FIRST, then its left subtree, then its right subtree.
  function visit(node) {
    if (node === null) return;
    result.push(node.val);
    visit(node.left);
    visit(node.right);
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

const DESCRIPTION = `**Preorder traversal** visits every node of a binary tree in the order *node, left subtree, right subtree*. It is a depth-first walk that handles a node **before** its children, which makes it the natural order for copying or serializing a tree and for printing a directory listing. The tree is passed as a level-order array and built into \`TreeNode\`s inside the function.

## Intuition

Imagine reading a book's table of contents: you announce a chapter, then immediately dive into its sections, and only after finishing all of them move on to the next chapter. Preorder does the same: "say my name first, then explore everything on my left, then everything on my right".

Why it works: the recursion \`visit(node)\` fully finishes the left subtree before it starts the right one, and it records the node before either call. The first value is therefore always the root, which is why a preorder list can rebuild a tree.

## How it works

1. If \`node\` is \`null\`, return (this is the base case that ends every branch).
2. Record \`node.val\` in \`result\`.
3. Recurse on \`node.left\`.
4. Recurse on \`node.right\`.
5. Start the whole process with \`visit(root)\`.

**Iterative version (not shown in the code):** replace the recursion by an explicit \`stack\`. Push \`root\`; then while the stack is not empty pop a node, record it, push its **right** child first and its **left** child second, so that the left child is popped (visited) first.

## Walkthrough

Test case 0 uses the tree \`[1, 2, 3, 4, 5, null, 6]\`:

\`\`\`
        1
       / \\
      2   3
     / \\   \\
    4   5   6
\`\`\`

| Call | Action | \`result\` |
|------|--------|----------|
| \`visit(1)\` | record 1, go left | \`[1]\` |
| \`visit(2)\` | record 2, go left | \`[1, 2]\` |
| \`visit(4)\` | record 4; both children are \`null\`, return | \`[1, 2, 4]\` |
| \`visit(5)\` | back in 2, go right: record 5, return | \`[1, 2, 4, 5]\` |
| \`visit(3)\` | back in 1, go right: record 3; left is \`null\` | \`[1, 2, 4, 5, 3]\` |
| \`visit(6)\` | 3's right child: record 6 | \`[1, 2, 4, 5, 3, 6]\` |

## Complexity

| Measure | Cost | Why |
|---------|------|-----|
| Time | O(n) | Every node is visited exactly once |
| Space | O(h) | The call stack is as deep as the tree height \`h\`: O(log n) if balanced, O(n) for a chain |

## When to use it

- Copying a tree, serializing it (the root comes first, so it can be rebuilt), or evaluating prefix expressions.
- Compared with **inorder** (sorted order for a BST) and **postorder** (children before parents, good for deleting a tree), preorder is the "top-down" order.
- Compared with **level-order**, it uses stack space proportional to the height instead of the width.

## Common pitfalls

- Recording the node after the recursive calls by accident; that turns it into postorder.
- Forgetting the \`null\` base case, which crashes on a missing child.
- In the iterative version, pushing the left child before the right one, which reverses the sibling order.
- Very deep (degenerate) trees can overflow the recursion stack; use the iterative version for those.

## What to watch in the visualizer

- The \`node\` pointer on the tree: it dives down the left edge first and only then moves right.
- The call stack panel: one frame per node on the current root-to-node path.
- \`result\` growing at the *first* time each node is reached, before its children.

## Example

\`\`\`
Input:  root = [1, 2, 3, 4, 5, null, 6]
Output: [1, 2, 4, 5, 3, 6]
\`\`\`
`;

export function buildPreorderTraversal(): QuestionInput {
  return {
    slug: "preorder-traversal",
    title: "Preorder Traversal",
    difficulty: "Easy",
    tags: ["tree", "traversal", "dfs", "recursion"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        method: "preorderTraversal",
        args: [[1, 2, 3, 4, 5, null, 6]],
        expected: [1, 2, 4, 5, 3, 6],
      },
      {
        method: "preorderTraversal",
        args: [[1, null, 2, 3]],
        expected: [1, 2, 3],
      },
      {
        method: "preorderTraversal",
        args: [[]],
        expected: [],
      },
      {
        method: "preorderTraversal",
        args: [[7]],
        expected: [7],
      },
    ],
    visualHints: { root: "tree" },
  };
}
