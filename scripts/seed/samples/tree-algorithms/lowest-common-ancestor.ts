import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `function lowestCommonAncestor(values, p, q) {
  const root = buildTree(values);
  // Returns the LCA if both p and q are below node, else whichever one is (or null)
  function lca(node) {
    if (node === null || node.val === p || node.val === q) return node;
    const left = lca(node.left);
    const right = lca(node.right);
    if (left !== null && right !== null) return node; // p and q split here
    return left !== null ? left : right; // pass up whatever was found
  }
  return lca(root).val;
}

// Builds TreeNodes from a LeetCode level-order array (null = missing child)
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

const DESCRIPTION = `The **lowest common ancestor (LCA)** of two nodes \`p\` and \`q\` in a rooted tree is the deepest node that has both of them as descendants (a node counts as a descendant of itself). LCA queries answer "where do these two paths meet?": distances between tree nodes, merge points in version control, and nearest shared category in a taxonomy. This sample finds the LCA in a general binary tree with a single post-order recursion. The tree arrives as a level-order array and is built into \`TreeNode\`s first.

## Intuition

Ask every subtree one question: "which of p and q do you contain?" and let the answers flow upward.

- A subtree that contains **neither** answers \`null\`.
- A subtree that contains **one** of them passes that node up.
- The first node where **both** sides answer non-null is where the two paths split: that is the LCA, and it passes itself up from then on.

If the current node *is* \`p\` or \`q\`, it can return immediately: either the other node is below it (so it is the LCA), or the other node is elsewhere and some ancestor will see both answers.

## How it works

1. Build the tree from the level-order array (\`buildTree\`).
2. \`lca(node)\`:
   1. If \`node\` is \`null\`, \`p\` or \`q\`, return \`node\`.
   2. Recurse into the left and right subtrees.
   3. If both results are non-null, return \`node\`: p and q are on different sides.
   4. Otherwise return the non-null result (or \`null\` if both are null).
3. Return the value of \`lca(root)\`.

## Walkthrough

Case 0: \`values = [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4]\`, \`p = 6\`, \`q = 4\`.

\`\`\`
        3
      /   \\
     5     1
    / \\   / \\
   6   2 0   8
      / \\
     7   4
\`\`\`

\`\`\`
lca(3)  not p or q, recurse
  lca(5)  recurse
    lca(6)  6 is p                     -> 6
    lca(2)  recurse
      lca(7) children null, null       -> null
      lca(4) 4 is q                    -> 4
      left null, right 4               -> 4
    left 6, right 4: both found         -> 5   (paths split here)
  lca(1)
    lca(0) -> null, lca(8) -> null      -> null
  left 5, right null                    -> 5
answer: 5
\`\`\`

## Complexity

| Case | Time | Space | Why |
|------|------|-------|-----|
| best | O(1) | O(1) | the root is p or q |
| average / worst | O(n) | O(h) | each node is visited at most once; recursion depth = tree height h (O(n) for a chain, O(log n) when balanced) |

## When to use it

- **One query on an arbitrary binary tree:** this O(n) recursion is the simplest correct answer.
- **BST shortcut:** in a binary search tree, start at the root; if both values are smaller go left, if both are larger go right, otherwise the current node is the LCA. O(h) time, O(1) space, no full traversal.
- **Many queries (binary lifting):** precompute \`up[k][v]\` = the 2^k-th ancestor of \`v\` and each node's depth (O(n log n)). For a query, lift the deeper node to the same depth, then lift both by decreasing powers of two while their ancestors differ; the parent where they stop is the LCA. O(log n) per query.
- **Other options:** Euler tour + range-minimum query gives O(1) queries after O(n log n) preprocessing; Tarjan's offline algorithm answers a batch of queries with union-find in near O(n + q).
- **Parent pointers available:** walk up from p collecting ancestors in a set, then walk up from q until you hit one.

## Common pitfalls

- Assuming p and q are both in the tree: if only one exists, this version returns that node instead of "not found". Count matches separately when that can happen.
- Returning booleans ("found / not found") from the recursion: the caller then knows *that* the paths split but not *where*. Return the node itself.
- Comparing nodes by value when values are not unique: compare node references instead.
- Using the BST shortcut on a tree that is not a BST.
- Deep, chain-like trees can overflow the call stack; use an iterative traversal with parent pointers for very deep trees.

## What to watch in the visualizer

- \`root\` is drawn as a tree; \`node\` moves through it in post-order while the call stack shows the path from the root.
- Watch \`left\` and \`right\` in each frame: they are the answers coming back from the subtrees. The frame for 5 is the first where both are non-null.
- \`values\` shows the level-order input, drawn as a tree as well.

## Example

\`\`\`
Input: values = [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p = 6, q = 4
Output: 5
\`\`\`

## Constraints

- The number of nodes is in the range \`[2, 10^5]\`; all values are unique.
- \`p != q\`, and both exist in the tree.
`;

export function buildLowestCommonAncestor(): QuestionInput {
  return {
    slug: "lowest-common-ancestor",
    title: "Lowest Common Ancestor of a Binary Tree",
    difficulty: "Medium",
    tags: ["tree", "dfs", "recursion", "lca"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "lowestCommonAncestor", args: [[3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], 6, 4], expected: 5 },
      { method: "lowestCommonAncestor", args: [[3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], 5, 1], expected: 3 },
      // one node is an ancestor of the other
      { method: "lowestCommonAncestor", args: [[3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], 5, 4], expected: 5 },
      { method: "lowestCommonAncestor", args: [[1, 2], 2, 1], expected: 1 },
    ],
    visualHints: {
      values: "tree",
    },
  };
}
