import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Solution {
  allPathsSourceTarget(graph) {
    const target = graph.length - 1;
    const res = [];
    const path = [0];
    const dfs = (node) => {
      if (node === target) {
        res.push([...path]);
        return;
      }
      for (const next of graph[node]) {
        path.push(next);
        dfs(next);
        path.pop();
      }
    };
    dfs(0);
    return res;
  }
}
`;

const DESCRIPTION = `Given a directed acyclic graph of \`n\` nodes labelled \`0\` to \`n - 1\`, find all possible paths from node \`0\` to node \`n - 1\` and return them in any order.

\`graph[i]\` is the list of nodes you can visit directly from node \`i\`.

## Example

\`\`\`
Input: graph = [[1, 2], [3], [3], []]
Output: [[0, 1, 3], [0, 2, 3]]
\`\`\`

## Constraints

- \`2 <= n <= 15\`
- The graph is acyclic and has no self-loops.
`;

export function buildAllPathsSourceTarget(): QuestionInput {
  return {
    slug: "all-paths-source-target",
    title: "All Paths From Source to Target",
    difficulty: "Medium",
    tags: ["graph", "dfs", "backtracking"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "allPathsSourceTarget", args: [[[1, 2], [3], [3], []]], expected: [[0, 1, 3], [0, 2, 3]] },
      { method: "allPathsSourceTarget", args: [[[4, 3, 1], [3, 2, 4], [3], [4], []]], expected: [[0, 4], [0, 3, 4], [0, 1, 3, 4], [0, 1, 2, 3, 4], [0, 1, 4]] },
      { method: "allPathsSourceTarget", args: [[[1], []]], expected: [[0, 1]] },
    ],
    visualHints: {},
  };
}
