import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `function diameterOfBinaryTree(values) {
  const root = buildTree(values);
  let best = 0; // longest path (in edges) seen so far
  // Returns the height of node's subtree, counted in nodes (0 for an empty subtree)
  function height(node) {
    if (node === null) return 0;
    const leftHeight = height(node.left);
    const rightHeight = height(node.right);
    // Longest path that bends at node: down the left side plus down the right side
    best = Math.max(best, leftHeight + rightHeight);
    return 1 + Math.max(leftHeight, rightHeight);
  }
  height(root);
  return best;
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

const DESCRIPTION = `The **diameter** of a tree is the number of edges on the longest path between any two nodes. The path may or may not pass through the root. It measures how "wide" a tree is: the worst-case latency in a tree-shaped network, or the longest chain of dependencies between two leaves. This sample computes it for a binary tree in one post-order pass by reusing the classic height recursion.

## Intuition

Every path in a tree has exactly one **highest node** where it bends: it comes up from one side and goes down the other. So the longest path is the best "bend" over all nodes, and the longest path bending at a node is

\`\`\`
height(left subtree) + height(right subtree)
\`\`\`

(with heights counted in nodes, that sum is the number of edges of the path through the node).

The height recursion already computes both child heights at every node. While it returns the height upward, it can also update a running maximum \`best\` on the side: one traversal, two answers.

## How it works

1. Build the tree from the level-order array.
2. \`height(node)\`:
   1. An empty subtree has height 0.
   2. Compute \`leftHeight\` and \`rightHeight\` recursively.
   3. Update \`best = max(best, leftHeight + rightHeight)\`: the longest path that bends at this node.
   4. Return \`1 + max(leftHeight, rightHeight)\` to the parent.
3. Call \`height(root)\` and return \`best\`.

## Walkthrough

Case 0: \`values = [1, 2, null, 3, 4, 5, null, null, 6]\`. The longest path, \`5 → 3 → 2 → 4 → 6\`, does **not** pass through the root.

\`\`\`
        1
       /
      2
     / \\
    3   4
   /     \\
  5       6
\`\`\`

\`\`\`
height(5)  left 0, right 0   best = max(0, 0) = 0   returns 1
height(3)  left 1, right 0   best = max(0, 1) = 1   returns 2
height(6)  left 0, right 0   best stays 1          returns 1
height(4)  left 0, right 1   best stays 1          returns 2
height(2)  left 2, right 2   best = max(1, 4) = 4   returns 3
height(1)  left 3, right 0   best stays 4 (3 < 4)  returns 4
answer: 4
\`\`\`

The path through the root (\`1 → 2 → 3 → 5\`) has only 3 edges; the best bend is at node 2.

## Complexity

| Measure | Cost | Why |
|---------|------|-----|
| time (all cases) | O(n) | each node is visited once and does O(1) work |
| space | O(h) | recursion depth = height h: O(log n) balanced, O(n) for a chain |

## When to use it

- **Binary trees:** this single DFS is optimal and simple.
- **General (n-ary) trees:** keep the two largest child heights instead of left and right.
- **Weighted trees or graphs that are trees:** the "double BFS/DFS" trick works too: from any node find the farthest node \`u\`, then the farthest node from \`u\` is at diameter distance. It needs two passes and an adjacency list, but no recursion over a rooted structure.
- **Naive alternative:** computing \`height(left) + height(right)\` separately at every node is O(n²) on skewed trees, because heights are recomputed again and again.

## Common pitfalls

- Returning the answer through the root only: \`height(root.left) + height(root.right)\` misses diameters that bend lower in the tree.
- Mixing up edges and nodes: with heights counted in nodes, \`leftHeight + rightHeight\` is the edge count; the node count would be one more.
- Recomputing heights in a separate function for every node (O(n²)).
- Forgetting the empty tree and the single-node tree: both have diameter 0.
- Very deep trees can overflow the call stack; switch to an iterative post-order for them.

## What to watch in the visualizer

- \`root\` is drawn as a tree; follow \`node\` through the post-order and the call stack.
- In each \`height\` frame, \`leftHeight\` and \`rightHeight\` arrive from the children; watch \`best\` jump from 1 to 4 when the frame for node 2 finishes.
- \`values\` shows the level-order input as a tree.

## Example

\`\`\`
Input: values = [1, 2, null, 3, 4, 5, null, null, 6]
Output: 4
\`\`\`

## Constraints

- The number of nodes is in the range \`[0, 10^4]\`.
- \`-100 <= Node.val <= 100\`
`;

export function buildTreeDiameter(): QuestionInput {
  return {
    slug: "tree-diameter",
    title: "Diameter of a Binary Tree",
    difficulty: "Easy",
    tags: ["tree", "dfs", "recursion", "height"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "diameterOfBinaryTree", args: [[1, 2, null, 3, 4, 5, null, null, 6]], expected: 4 },
      { method: "diameterOfBinaryTree", args: [[1, 2, 3, 4, 5]], expected: 3 },
      { method: "diameterOfBinaryTree", args: [[1]], expected: 0 },
      { method: "diameterOfBinaryTree", args: [[]], expected: 0 },
    ],
    visualHints: {
      values: "tree",
    },
  };
}
