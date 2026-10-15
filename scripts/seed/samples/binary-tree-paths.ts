import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `function binaryTreePaths(values) {
  const nodes = values.map((v) => (v === null ? null : new TreeNode(v)));
  let next = 1;
  for (const node of nodes) {
    if (node === null) continue;
    if (next < nodes.length) node.left = nodes[next++];
    if (next < nodes.length) node.right = nodes[next++];
  }
  const root = nodes[0] || null;
  const res = [];
  function dfs(node, path) {
    if (node === null) return;
    path.push(String(node.val));
    if (node.left === null && node.right === null) {
      res.push(path.join("->"));
    } else {
      dfs(node.left, path);
      dfs(node.right, path);
    }
    path.pop();
  }
  dfs(root, []);
  return res;
}
`;

const DESCRIPTION = `Given the root of a binary tree, return all root-to-leaf paths in any order.

The tree is passed as a level-order array (\`null\` marks a missing child) and built into nodes inside the function.

## Example

\`\`\`
Input: root = [1, 2, 3, null, 5]
Output: ["1->2->5", "1->3"]
\`\`\`

## Constraints

- The number of nodes is in the range \`[1, 100]\`.
- \`-100 <= Node.val <= 100\`
`;

export function buildBinaryTreePaths(): QuestionInput {
  return {
    slug: "binary-tree-paths",
    title: "Binary Tree Paths",
    difficulty: "Easy",
    tags: ["tree", "dfs", "backtracking"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "binaryTreePaths", args: [[1, 2, 3, null, 5]], expected: ["1->2->5", "1->3"] },
      { method: "binaryTreePaths", args: [[1]], expected: ["1"] },
      { method: "binaryTreePaths", args: [[4, 2, 7, 1, 3]], expected: ["4->2->1", "4->2->3", "4->7"] },
    ],
    visualHints: {},
  };
}
