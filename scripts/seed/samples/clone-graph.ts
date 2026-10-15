import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `function cloneGraph(adjList) {
  // adjList[i] = neighbours of node i + 1 (LeetCode format); nodes are { val, neighbors }
  const nodes = adjList.map((_, i) => ({ val: i + 1, neighbors: [] }));
  adjList.forEach((list, i) => {
    for (const j of list) nodes[i].neighbors.push(nodes[j - 1]);
  });
  const start = nodes.length > 0 ? nodes[0] : null;
  const copies = new Map();
  function clone(node) {
    if (copies.has(node)) return copies.get(node);
    const copy = { val: node.val, neighbors: [] };
    copies.set(node, copy);
    for (const neighbor of node.neighbors) {
      copy.neighbors.push(clone(neighbor));
    }
    return copy;
  }
  const root = start === null ? null : clone(start);
  const out = [];
  for (const [original, copy] of copies) {
    out[copy.val - 1] = copy.neighbors.map((n) => n.val);
  }
  return root === null ? [] : out;
}
`;

const DESCRIPTION = `Given a reference to a node in a connected undirected graph, return a deep copy of the graph. Each node has a \`val\` and a list of \`neighbors\`.

The graph is passed as an adjacency list (\`adjList[i]\` holds the neighbours of node \`i + 1\`), built into node objects inside the function. The returned value is the adjacency list of the clone.

## Example

\`\`\`
Input: adjList = [[2, 4], [1, 3], [2, 4], [1, 3]]
Output: [[2, 4], [1, 3], [2, 4], [1, 3]]
\`\`\`

## Constraints

- The number of nodes is in the range \`[0, 100]\`.
- There are no repeated edges and no self-loops.
`;

export function buildCloneGraph(): QuestionInput {
  return {
    slug: "clone-graph",
    title: "Clone Graph",
    difficulty: "Medium",
    tags: ["graph", "dfs", "hash-table"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "cloneGraph", args: [[[2, 4], [1, 3], [2, 4], [1, 3]]], expected: [[2, 4], [1, 3], [2, 4], [1, 3]] },
      { method: "cloneGraph", args: [[[]]], expected: [[]] },
      { method: "cloneGraph", args: [[[2], [1]]], expected: [[2], [1]] },
    ],
    visualHints: {},
  };
}
