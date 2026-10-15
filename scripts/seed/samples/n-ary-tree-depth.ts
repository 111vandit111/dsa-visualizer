import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `function maxDepth(parents) {
  // parents[i] = parent index of node i (-1 for the root); node value = i
  const nodes = parents.map((_, i) => ({ val: i, children: [] }));
  let root = null;
  for (let i = 0; i < parents.length; i++) {
    if (parents[i] === -1) root = nodes[i];
    else nodes[parents[i]].children.push(nodes[i]);
  }
  function depth(node) {
    if (node === null) return 0;
    let deepest = 0;
    for (const child of node.children) {
      deepest = Math.max(deepest, depth(child));
    }
    return deepest + 1;
  }
  return depth(root);
}
`;

const DESCRIPTION = `Given an n-ary tree, return its maximum depth: the number of nodes along the longest path from the root down to the farthest leaf.

The tree is passed as a \`parents\` array (\`parents[i]\` is the parent of node \`i\`, \`-1\` for the root) and built into \`{ val, children }\` nodes inside the function.

## Example

\`\`\`
Input: parents = [-1, 0, 0, 0, 2, 2]
Output: 3
\`\`\`

## Constraints

- The number of nodes is in the range \`[0, 10^4]\`.
- The depth of the tree is at most \`1000\`.
`;

export function buildNaryTreeDepth(): QuestionInput {
  return {
    slug: "n-ary-tree-depth",
    title: "Maximum Depth of N-ary Tree",
    difficulty: "Easy",
    tags: ["tree", "dfs", "recursion"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "maxDepth", args: [[-1, 0, 0, 0, 2, 2]], expected: 3 },
      { method: "maxDepth", args: [[-1, 0, 1, 2, 3]], expected: 5 },
      { method: "maxDepth", args: [[-1]], expected: 1 },
    ],
    visualHints: {},
  };
}
