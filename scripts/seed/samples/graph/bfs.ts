import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Solution {
  bfs(n, edges, source) {
    const adj = Array.from({ length: n }, () => []);
    for (const [u, v] of edges) {
      adj[u].push(v);
      adj[v].push(u);
    }

    const visited = new Array(n).fill(false);
    const dist = new Array(n).fill(-1); // hops from source, -1 = not reached
    const order = [];
    const queue = [source];
    visited[source] = true; // mark when ENQUEUED so a vertex enters the queue once
    dist[source] = 0;

    while (queue.length > 0) {
      const node = queue.shift();
      order.push(node);
      for (const next of adj[node]) {
        if (!visited[next]) {
          visited[next] = true;
          dist[next] = dist[node] + 1;
          queue.push(next);
        }
      }
    }
    return [order, dist];
  }
}
`;

const DESCRIPTION = `Breadth-first search (BFS) explores a graph level by level from a source vertex: first the source, then everything one edge away, then everything two edges away, and so on. It returns the visit order and, on an unweighted graph, the fewest edges (hops) from the source to every vertex.

## Intuition

Drop a pebble in a pond and watch the ripples: the first ring touches everything at distance 1, the next ring everything at distance 2. BFS is that ripple. A **queue** (first in, first out) keeps the ripples in order: vertices discovered earlier are expanded earlier, so no vertex at distance \`d + 1\` is ever expanded before all vertices at distance \`d\`.

That ordering is the invariant, and it is why the first time BFS reaches a vertex it has found a shortest path in an unweighted graph.

## How it works

1. Create \`visited\` (all false), \`dist\` (all -1) and a \`queue\` holding \`source\`; mark \`source\` visited with \`dist = 0\`.
2. While the queue is not empty, remove the front vertex \`node\` and append it to \`order\`.
3. For each neighbour \`next\` of \`node\` that is not visited: mark it visited, set \`dist[next] = dist[node] + 1\`, and push it to the back of the queue.
4. When the queue is empty, return the visit order and the distances.

## Walkthrough

Test case 0: \`n = 6\`, edges \`[[0,1],[0,2],[1,3],[2,4],[3,5],[4,5]]\`, source \`0\`. The adjacency list is \`[[1,2], [0,3], [0,4], [1,5], [2,5], [3,4]]\`.

| Step | node | queue after | dist after |
| --- | --- | --- | --- |
| start | - | \`[0]\` | \`[0,-1,-1,-1,-1,-1]\` |
| pop 0 | 0 | \`[1,2]\` | \`[0,1,1,-1,-1,-1]\` |
| pop 1 | 1 | \`[2,3]\` | \`[0,1,1,2,-1,-1]\` |
| pop 2 | 2 | \`[3,4]\` | \`[0,1,1,2,2,-1]\` |
| pop 3 | 3 | \`[4,5]\` | \`[0,1,1,2,2,3]\` |
| pop 4 | 4 | \`[5]\` | unchanged (5 already visited) |
| pop 5 | 5 | \`[]\` | unchanged |

The result is order \`[0,1,2,3,4,5]\` and \`dist = [0,1,1,2,2,3]\`.

## Complexity

| | Time | Space | Reason |
| --- | --- | --- | --- |
| Best / average / worst | O(V + E) | O(V) | Every vertex is enqueued once and every adjacency entry is looked at once; the queue, \`visited\` and \`dist\` hold at most V items. |

(Using \`shift()\` on a plain array can cost O(V) per call in a large engine; a head index or a real queue keeps the total at O(V + E).)

## When to use it

- Shortest path by **number of edges** in unweighted graphs, grids and mazes; level-order traversal; "minimum steps" puzzles; finding connected components.
- Not suitable for weighted shortest paths (use Dijkstra) or when you need to go deep first, such as cycle detection with colours or topological order via DFS.
- Uses more memory than DFS on wide graphs: the queue can hold a whole level at once.

## Common pitfalls

- Marking visited when you **dequeue** instead of when you **enqueue** lets the same vertex enter the queue many times.
- Forgetting the \`visited\` array on a graph with cycles loops forever.
- Using BFS distances on a weighted graph gives wrong answers.
- Disconnected graphs: vertices unreachable from the source keep \`dist = -1\`.

## What to watch in the visualizer

Follow \`queue\` as it grows at the back and shrinks at the front, and \`visited\` as it fills. In the node-link view of \`adj\`, the vertex held by \`node\` is the one being expanded and \`next\` is the neighbour being tested. Check that \`dist\` values only ever increase by one per ring.

## Example

\`\`\`
Input: n = 6, edges = [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5]], source = 0
Output: [[0, 1, 2, 3, 4, 5], [0, 1, 1, 2, 2, 3]]
\`\`\`
`;

export function buildBfs(): QuestionInput {
  return {
    slug: "bfs",
    title: "Breadth-First Search (BFS)",
    difficulty: "Easy",
    tags: ["graph", "bfs", "traversal", "shortest-path"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "bfs", args: [6, [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5]], 0], expected: [[0, 1, 2, 3, 4, 5], [0, 1, 1, 2, 2, 3]] },
      { method: "bfs", args: [5, [[0, 1], [1, 2], [0, 3], [3, 4], [2, 4]], 2], expected: [[2, 1, 4, 0, 3], [2, 1, 0, 2, 1]] },
      { method: "bfs", args: [4, [[0, 1], [2, 3]], 0], expected: [[0, 1], [0, 1, -1, -1]] },
    ],
    visualHints: { adj: "graph", edges: "array" },
  };
}
