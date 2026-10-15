import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Solution {
  buildList(n, edges, directed) {
    // one (initially empty) neighbour list per vertex
    const adj = Array.from({ length: n }, () => []);
    for (const [u, v] of edges) {
      adj[u].push(v);
      if (!directed) {
        adj[v].push(u); // an undirected edge is listed under both endpoints
      }
    }
    return adj;
  }
}
`;

const DESCRIPTION = `An adjacency list stores a graph as an array with one entry per vertex: \`adj[u]\` is the list of vertices you can reach from \`u\` in one step. The task is to build that structure from a list of edges, for a directed or an undirected graph.

## Intuition

Think of a phone contacts app: each person stores only the numbers of the people they actually know, not a blank slot for every other person on Earth. The adjacency list does the same, so it uses memory proportional to the number of vertices plus the number of real edges.

The invariant is simple: \`v\` appears in \`adj[u]\` exactly when the edge \`u -> v\` exists. For an undirected edge \`u - v\` that means both \`adj[u]\` contains \`v\` and \`adj[v]\` contains \`u\`.

## How it works

1. Create \`adj\` with \`n\` empty lists, one per vertex.
2. For every edge \`[u, v]\`, push \`v\` onto \`adj[u]\`.
3. If the graph is undirected, also push \`u\` onto \`adj[v]\`.
4. Return \`adj\`. Neighbours appear in the order the edges were given.

## Walkthrough

Test case 0: \`n = 4\`, edges \`[[0,1], [0,2], [1,2], [2,3]]\`, undirected.

| Edge | Lists changed | \`adj\` after the step |
| --- | --- | --- |
| start | none | \`[[], [], [], []]\` |
| \`[0,1]\` | \`adj[0]\`, \`adj[1]\` | \`[[1], [0], [], []]\` |
| \`[0,2]\` | \`adj[0]\`, \`adj[2]\` | \`[[1,2], [0], [0], []]\` |
| \`[1,2]\` | \`adj[1]\`, \`adj[2]\` | \`[[1,2], [0,2], [0,1], []]\` |
| \`[2,3]\` | \`adj[2]\`, \`adj[3]\` | \`[[1,2], [0,2], [0,1,3], [2]]\` |

## Complexity

| | Time | Space | Reason |
| --- | --- | --- | --- |
| Build | O(n + E) | O(n + E) | One list per vertex, then each edge adds one or two entries. |
| Edge lookup \`u -> v\` | O(deg(u)) | - | The list of \`u\` must be scanned (O(1) if you use a Set per vertex). |
| List all neighbours of \`u\` | O(deg(u)) | - | Exactly the neighbours, nothing else is touched. |

## When to use it

- The default choice: BFS, DFS, Dijkstra, Prim, topological sort all iterate over neighbours, which is exactly what the list gives cheaply.
- **Sparse vs dense**: for a sparse graph (E near n) the list is far smaller than an adjacency matrix. For a dense graph (E near n^2) both use about n^2 memory, and the matrix additionally gives O(1) edge lookup.
- Weights are stored as pairs: \`adj[u].push([v, weight])\`.

## Common pitfalls

- Forgetting the reverse push for an undirected graph, so traversals only work in one direction.
- Writing \`new Array(n).fill([])\`, which makes every vertex share one list. Use \`Array.from\` with a function.
- Duplicate edges produce duplicate neighbours; deduplicate with a Set if the input may repeat edges.
- Vertex labels not in \`0..n-1\` need a map from label to index first.

## What to watch in the visualizer

Follow \`adj\`: the node-link view grows one edge at a time as \`adj[u].push(v)\` runs. Watch \`u\` and \`v\` mark the current edge, and notice how each undirected edge appears under both endpoints, so every list length equals the degree of its vertex.

## Example

\`\`\`
Input: n = 4, edges = [[0, 1], [0, 2], [1, 2], [2, 3]], directed = false
Output: [[1, 2], [0, 2], [0, 1, 3], [2]]
\`\`\`
`;

export function buildAdjacencyList(): QuestionInput {
  return {
    slug: "adjacency-list",
    title: "Adjacency List",
    difficulty: "Easy",
    tags: ["graph", "adjacency-list", "representation"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "buildList", args: [4, [[0, 1], [0, 2], [1, 2], [2, 3]], false], expected: [[1, 2], [0, 2], [0, 1, 3], [2]] },
      { method: "buildList", args: [3, [[0, 1], [1, 2], [0, 2]], true], expected: [[1, 2], [2], []] },
      { method: "buildList", args: [3, [], false], expected: [[], [], []] },
    ],
    visualHints: { adj: "graph", edges: "array" },
  };
}
