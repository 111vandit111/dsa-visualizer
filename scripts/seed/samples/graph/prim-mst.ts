import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Solution {
  prim(n, edges) {
    const adj = Array.from({ length: n }, () => []);
    for (const [u, v, w] of edges) {
      adj[u].push([v, w]);
      adj[v].push([u, w]);
    }

    const visited = new Array(n).fill(false);
    const mst = [];
    let total = 0;

    // min-heap of edges leaving the tree: [weight, vertex reached, vertex we came from]
    const pq = new PriorityQueue((a, b) => a[0] - b[0]);
    visited[0] = true;
    for (const [next, weight] of adj[0]) {
      pq.enqueue([weight, next, 0]);
    }

    while (!pq.isEmpty() && mst.length < n - 1) {
      const [weight, node, from] = pq.dequeue();
      if (visited[node]) continue; // this edge would close a cycle
      visited[node] = true; // cheapest edge leaving the tree: take it
      total += weight;
      mst.push([Math.min(from, node), Math.max(from, node), weight]);
      for (const [next, nextWeight] of adj[node]) {
        if (!visited[next]) {
          pq.enqueue([nextWeight, next, node]);
        }
      }
    }

    mst.sort((a, b) => a[2] - b[2] || a[0] - b[0] || a[1] - b[1]);
    return [total, mst];
  }
}
`;

const DESCRIPTION = `Prim's algorithm builds a minimum spanning tree (MST) of a connected, weighted, undirected graph: a set of \`n - 1\` edges that connects every vertex with the smallest possible total weight. It returns the total weight and the chosen edges, sorted by weight.

## Intuition

Start with a single vertex and grow a tree outward, like a crystal. At every step look at all edges that leave the current tree and join the cheapest one. This greedy choice is safe because of the **cut property**: for any split of the vertices into "inside the tree" and "outside", the cheapest edge crossing the split belongs to some MST. A min-heap keeps the candidate edges ordered so the cheapest is always at the top.

## How it works

1. Mark vertex \`0\` as visited and push all its edges onto a min-heap as \`[weight, neighbour, 0]\`.
2. Pop the cheapest edge. If its far end is already visited it would form a cycle: discard it.
3. Otherwise mark that vertex visited, add the weight to \`total\`, and record the edge in \`mst\`.
4. Push every edge from the new vertex to a still-unvisited neighbour.
5. Stop when \`n - 1\` edges are chosen (or the heap runs out). Sort \`mst\` by weight and return \`[total, mst]\`.

## Walkthrough

Test case 0: \`n = 5\`, edges \`[[0,1,2],[0,3,6],[1,2,3],[1,3,8],[1,4,5],[2,4,7],[3,4,9]]\`.

| Pop \`[w, node, from]\` | Decision | \`total\` | \`mst\` |
| --- | --- | --- | --- |
| start | visit 0, push (2 to 1) and (6 to 3) | 0 | \`[]\` |
| \`[2, 1, 0]\` | take; push 3 to 2, 8 to 3, 5 to 4 | 2 | \`[[0,1,2]]\` |
| \`[3, 2, 1]\` | take; push 7 to 4 | 5 | \`+ [1,2,3]\` |
| \`[5, 4, 1]\` | take; push 9 to 3 | 10 | \`+ [1,4,5]\` |
| \`[6, 3, 0]\` | take; 4 edges chosen, stop | 16 | \`+ [0,3,6]\` |

Result: total \`16\` with edges \`[[0,1,2],[1,2,3],[1,4,5],[0,3,6]]\`.

## Complexity

| | Time | Space | Reason |
| --- | --- | --- | --- |
| Binary heap (this code) | O(E log E) | O(V + E) | Each edge is pushed and popped at most once at O(log E) per heap operation. |
| Dense graph with matrix + array | O(V^2) | O(V) | Choosing the cheapest vertex by scanning, no heap needed. |

## When to use it

- Laying cables, pipes or roads at minimum cost; clustering; approximating the travelling salesman problem.
- **vs. Kruskal:** Prim grows one tree; on dense graphs its O(V^2) array version (no heap) beats the heap version, which is the better choice for sparse graphs. Kruskal sorts all edges and needs union-find, shines on sparse graphs and works naturally on disconnected graphs (giving a forest).
- **vs. Dijkstra:** the code is almost identical, but Prim orders by the weight of one edge, Dijkstra by the total distance from the source.

## Common pitfalls

- Prim needs a connected graph; on a disconnected graph it only spans the source's component.
- Mixing up edge weight with path length (the Dijkstra key) gives a wrong tree.
- Not skipping already-visited vertices when popping lets cycles in.
- With equal weights the MST may not be unique; the total is, the edges may differ.

## What to watch in the visualizer

Follow \`visited\` growing, the \`pq\` heap of candidate edges, and \`mst\`/\`total\` extending by one edge per accepted pop. In the node-link view of \`adj\`, \`node\` and \`from\` mark the edge just taken, and the pops that hit \`continue\` are edges rejected for closing a cycle.

## Example

\`\`\`
Input: n = 5, edges = [[0, 1, 2], [0, 3, 6], [1, 2, 3], [1, 3, 8], [1, 4, 5], [2, 4, 7], [3, 4, 9]]
Output: [16, [[0, 1, 2], [1, 2, 3], [1, 4, 5], [0, 3, 6]]]
\`\`\`
`;

export function buildPrimMst(): QuestionInput {
  return {
    slug: "prim-mst",
    title: "Prim's Minimum Spanning Tree",
    difficulty: "Medium",
    tags: ["graph", "mst", "prim", "greedy", "heap"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "prim", args: [5, [[0, 1, 2], [0, 3, 6], [1, 2, 3], [1, 3, 8], [1, 4, 5], [2, 4, 7], [3, 4, 9]]], expected: [16, [[0, 1, 2], [1, 2, 3], [1, 4, 5], [0, 3, 6]]] },
      { method: "prim", args: [3, [[0, 1, 1], [1, 2, 2], [0, 2, 3]]], expected: [3, [[0, 1, 1], [1, 2, 2]]] },
      { method: "prim", args: [4, [[0, 1, 4], [1, 2, 1], [2, 3, 2]]], expected: [7, [[1, 2, 1], [2, 3, 2], [0, 1, 4]]] },
    ],
    visualHints: { adj: "graph", pq: "heap", edges: "array" },
  };
}
