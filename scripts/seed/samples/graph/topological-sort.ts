import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Solution {
  topoSort(n, edges) {
    const adj = Array.from({ length: n }, () => []);
    const indegree = new Array(n).fill(0);
    for (const [u, v] of edges) {
      adj[u].push(v); // directed: u must come before v
      indegree[v]++;
    }

    // start with every vertex that has no prerequisites
    const queue = [];
    for (let i = 0; i < n; i++) {
      if (indegree[i] === 0) queue.push(i);
    }

    const order = [];
    while (queue.length > 0) {
      const node = queue.shift();
      order.push(node);
      for (const next of adj[node]) {
        indegree[next]--; // one prerequisite of next is now done
        if (indegree[next] === 0) queue.push(next);
      }
    }

    // vertices on a cycle never reach indegree 0, so the order stays short
    return order.length === n ? order : [];
  }
}
`;

const DESCRIPTION = `A topological sort lines up the vertices of a directed acyclic graph (DAG) so that for every edge \`u -> v\`, vertex \`u\` comes before \`v\`. This solves scheduling problems such as course prerequisites or build orders. If the graph has a cycle no such order exists, and the function returns an empty array.

## Intuition

Getting dressed: socks before shoes, trousers before belt. Always pick something with **no unmet prerequisites**. Kahn's algorithm does exactly that: it counts each vertex's unmet prerequisites (its *indegree*), repeatedly takes a vertex with count zero, and "completes" it by lowering the count of everything that depends on it. If at some point nothing has count zero but vertices remain, they depend on each other in a loop, which is a cycle.

## How it works

1. Build \`adj\` and count \`indegree[v]\` = number of incoming edges for each vertex.
2. Put every vertex with indegree 0 into \`queue\`.
3. Pop \`node\`, append it to \`order\`.
4. For each \`next\` in \`adj[node]\`, decrement \`indegree[next]\`; if it reaches 0, push \`next\`.
5. Repeat until the queue is empty. If \`order\` holds all \`n\` vertices return it; otherwise there was a cycle, return \`[]\`.

**DFS variant:** run a DFS, and append each vertex to a list *after* all its neighbours are finished; reversing that list is a topological order. A cycle is detected when the DFS reaches a vertex that is still "in progress" on the current recursion path.

## Walkthrough

Test case 0: \`n = 6\`, edges \`[[5,2],[5,0],[4,0],[4,1],[2,3],[3,1]]\`. Initial \`indegree = [2,2,1,1,0,0]\`, so \`queue = [4,5]\`.

| Pop | Decrements | \`indegree\` after | \`queue\` after | \`order\` |
| --- | --- | --- | --- | --- |
| 4 | 0, 1 | \`[1,1,1,1,0,0]\` | \`[5]\` | \`[4]\` |
| 5 | 2, 0 | \`[0,1,0,1,0,0]\` | \`[2,0]\` | \`[4,5]\` |
| 2 | 3 | \`[0,1,0,0,0,0]\` | \`[0,3]\` | \`[4,5,2]\` |
| 0 | none | unchanged | \`[3]\` | \`[4,5,2,0]\` |
| 3 | 1 | \`[0,0,0,0,0,0]\` | \`[1]\` | \`[4,5,2,0,3]\` |
| 1 | none | unchanged | \`[]\` | \`[4,5,2,0,3,1]\` |

The order has all 6 vertices, so the answer is \`[4, 5, 2, 0, 3, 1]\`.

## Complexity

| | Time | Space | Reason |
| --- | --- | --- | --- |
| Best / average / worst | O(V + E) | O(V + E) | Each vertex is queued once and each edge decrements one indegree; \`adj\`, \`indegree\` and \`queue\` hold O(V + E). |

## When to use it

- Task scheduling, course prerequisites, build systems, spreadsheet cell evaluation order, dependency resolution.
- **Kahn (BFS) vs DFS:** Kahn's is iterative, gives a natural cycle check (\`order.length < n\`) and can list parallelisable "waves"; the DFS version is shorter if you already have a recursive traversal.
- The order is **not unique**: any valid order is correct. A min-heap instead of a queue gives the lexicographically smallest one.

## Common pitfalls

- Applying it to an undirected graph or a graph with cycles: there is no valid order; always check the length of \`order\`.
- Counting indegree from the wrong end of the edge (\`indegree[u]++\` instead of \`indegree[v]++\`).
- Forgetting vertices with no edges at all: they have indegree 0 and must still be queued.
- Expecting one unique answer when tests compare orders; the sample fixes neighbour order so the result is deterministic.

## What to watch in the visualizer

Follow \`indegree\` dropping toward zero, \`queue\` receiving a vertex the instant its count hits 0, and \`order\` growing. In the node-link view of \`adj\`, \`node\` is the vertex being completed and \`next\` the dependent whose count is decreasing.

## Example

\`\`\`
Input: n = 6, edges = [[5, 2], [5, 0], [4, 0], [4, 1], [2, 3], [3, 1]]
Output: [4, 5, 2, 0, 3, 1]
\`\`\`
`;

export function buildTopologicalSort(): QuestionInput {
  return {
    slug: "topological-sort",
    title: "Topological Sort (Kahn's Algorithm)",
    difficulty: "Medium",
    tags: ["graph", "topological-sort", "bfs", "dag"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "topoSort", args: [6, [[5, 2], [5, 0], [4, 0], [4, 1], [2, 3], [3, 1]]], expected: [4, 5, 2, 0, 3, 1] },
      { method: "topoSort", args: [4, [[0, 1], [0, 2], [1, 3], [2, 3]]], expected: [0, 1, 2, 3] },
      { method: "topoSort", args: [3, [[0, 1], [1, 2], [2, 0]]], expected: [] },
    ],
    visualHints: { adj: "graph" },
  };
}
