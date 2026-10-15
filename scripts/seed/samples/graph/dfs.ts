import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Solution {
  dfs(n, edges, source) {
    const adj = Array.from({ length: n }, () => []);
    for (const [u, v] of edges) {
      adj[u].push(v);
      adj[v].push(u);
    }

    const visited = new Array(n).fill(false);
    const order = [];

    const visit = (node) => {
      visited[node] = true;
      order.push(node); // pre-order: record the vertex when first reached
      for (const next of adj[node]) {
        if (!visited[next]) {
          visit(next); // go as deep as possible before trying the next neighbour
        }
      }
    };

    visit(source);
    return order;
  }
}
`;

const DESCRIPTION = `Depth-first search (DFS) explores a graph by going as deep as possible along one path, and only backing up when it hits a dead end. It returns the order in which vertices are first reached from a source vertex.

## Intuition

Exploring a maze with a ball of string: you walk down a corridor, at every junction take the first unexplored branch, and when you hit a dead end you follow the string back to the last junction that still has an unexplored branch. The string is the **call stack** of the recursion, and unrolling it is the "backtracking" part.

The invariant is that a vertex is marked visited the moment it is reached, so each vertex is explored once, and the recursion on a vertex only ends after every vertex reachable from it through unvisited vertices has been explored.

## How it works

1. Create \`visited\` (all false) and an empty \`order\`.
2. \`visit(node)\`: mark \`node\` visited and append it to \`order\`.
3. For each neighbour \`next\` of \`node\`, if it is not visited, call \`visit(next)\` recursively.
4. Call \`visit(source)\` and return \`order\`.

**Iterative version:** replace the recursion with an explicit \`stack\`. Push \`source\`; repeatedly pop a vertex, skip it if already visited, otherwise mark it, record it and push its unvisited neighbours (push them in reverse if you want the same order as the recursive version). This avoids stack overflow on very deep graphs.

## Walkthrough

Test case 0: \`n = 6\`, edges \`[[0,1],[0,2],[1,3],[2,4],[3,5],[4,5]]\`, source \`0\`. Adjacency list: \`[[1,2], [0,3], [0,4], [1,5], [2,5], [3,4]]\`.

| Call | Action | order after |
| --- | --- | --- |
| \`visit(0)\` | first reach 0, try neighbour 1 | \`[0]\` |
| \`visit(1)\` | neighbour 0 visited, go to 3 | \`[0,1]\` |
| \`visit(3)\` | neighbour 1 visited, go to 5 | \`[0,1,3]\` |
| \`visit(5)\` | neighbour 3 visited, go to 4 | \`[0,1,3,5]\` |
| \`visit(4)\` | neighbour 2 not visited, go to 2 | \`[0,1,3,5,4]\` |
| \`visit(2)\` | both neighbours visited, return | \`[0,1,3,5,4,2]\` |

Then every call returns in turn (2, 4, 5, 3, 1) and \`0\` finds its second neighbour \`2\` already visited. The result is \`[0,1,3,5,4,2]\`.

## Complexity

| | Time | Space | Reason |
| --- | --- | --- | --- |
| Best / average / worst | O(V + E) | O(V) | Each vertex is visited once and each adjacency entry examined once; the recursion stack can be V deep on a path-shaped graph. |

## When to use it

- Cycle detection, topological sorting, connected components, finding bridges and articulation points, solving mazes and backtracking searches.
- Compared with BFS, DFS uses less memory on wide graphs but does **not** find shortest paths in unweighted graphs: the first path it finds can be long.
- Recursion depth equals path length; for huge inputs prefer the iterative stack version.

## Common pitfalls

- Not marking \`visited\` before recursing makes cycles recurse forever.
- Recursion limits: a graph that is one long chain of 100,000 vertices overflows the call stack.
- The order depends on the order of neighbours in \`adj\`; the same graph can give different (all valid) orders.
- On disconnected graphs, one call only covers the source's component; loop over all vertices to cover the rest.

## What to watch in the visualizer

Watch the **call stack** panel grow as \`visit\` goes deeper and shrink as it backtracks, and \`order\` grow at the moment of the first visit. In the node-link view of \`adj\`, \`node\` marks the vertex being explored and \`next\` the neighbour being tried; \`visited\` shows which vertices are finished with.

## Example

\`\`\`
Input: n = 6, edges = [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5]], source = 0
Output: [0, 1, 3, 5, 4, 2]
\`\`\`
`;

export function buildDfs(): QuestionInput {
  return {
    slug: "dfs",
    title: "Depth-First Search (DFS)",
    difficulty: "Easy",
    tags: ["graph", "dfs", "traversal", "recursion"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "dfs", args: [6, [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5]], 0], expected: [0, 1, 3, 5, 4, 2] },
      { method: "dfs", args: [5, [[0, 1], [1, 2], [0, 3], [3, 4], [2, 4]], 2], expected: [2, 1, 0, 3, 4] },
      { method: "dfs", args: [4, [[0, 1], [2, 3]], 0], expected: [0, 1] },
    ],
    visualHints: { adj: "graph", edges: "array" },
  };
}
