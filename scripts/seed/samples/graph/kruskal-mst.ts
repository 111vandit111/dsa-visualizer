import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Solution {
  kruskal(n, edges) {
    // weighted adjacency view of the input, only so the visualizer can draw the undirected graph
    const adj = Array.from({ length: n }, () => []);
    for (const [u, v, w] of edges) {
      adj[u].push([v, w]);
      adj[v].push([u, w]);
    }

    // union-find: parent[x] points toward the representative of x's group
    const parent = Array.from({ length: n }, (_, i) => i);
    const rank = new Array(n).fill(0);

    const find = (x) => {
      if (parent[x] !== x) {
        parent[x] = find(parent[x]); // path compression: hang x directly under the root
      }
      return parent[x];
    };

    const union = (a, b) => {
      const rootA = find(a);
      const rootB = find(b);
      if (rootA === rootB) return false; // already connected: edge would close a cycle
      // union by rank: attach the shallower tree under the deeper one
      if (rank[rootA] < rank[rootB]) {
        parent[rootA] = rootB;
      } else if (rank[rootA] > rank[rootB]) {
        parent[rootB] = rootA;
      } else {
        parent[rootB] = rootA;
        rank[rootA]++;
      }
      return true;
    };

    const sorted = [...edges].sort((a, b) => a[2] - b[2]);
    const mst = [];
    let total = 0;
    for (const [u, v, w] of sorted) {
      if (union(u, v)) {
        total += w;
        mst.push([Math.min(u, v), Math.max(u, v), w]);
        if (mst.length === n - 1) break; // a spanning tree is complete
      }
    }
    return [total, mst];
  }
}
`;

const DESCRIPTION = `Kruskal's algorithm builds a minimum spanning tree (MST) of a weighted, undirected graph: \`n - 1\` edges that connect every vertex with the smallest possible total weight. It sorts all edges by weight and adds each one unless it would create a cycle. It returns the total weight and the chosen edges.

## Intuition

Imagine buying the cheapest road first, then the next cheapest, and so on, but never paying for a road that connects two towns already linked by earlier roads. Each town starts as its own group; every accepted edge merges two groups. The greedy choice is safe by the **cut property**: the cheapest edge between two different groups always belongs to some MST.

The question "are \`u\` and \`v\` already connected?" is answered quickly by **union-find** (disjoint sets). Two tricks keep it near O(1): *path compression* flattens the chain when you look up a root, and *union by rank* keeps trees shallow by attaching the smaller tree under the larger.

## How it works

1. Start with every vertex as its own set: \`parent[i] = i\`, \`rank[i] = 0\`.
2. Sort the edges by weight, smallest first.
3. For each edge \`[u, v, w]\`, find the roots of \`u\` and \`v\`.
4. If the roots are equal, the edge closes a cycle: skip it.
5. Otherwise union the two sets (attach the lower-rank root under the higher-rank one), add \`w\` to \`total\` and record the edge.
6. Stop once \`n - 1\` edges are chosen; return \`[total, mst]\`.

## Walkthrough

Test case 0: \`n = 5\`, edges \`[[0,1,1],[2,3,2],[0,2,3],[1,3,4],[3,4,5],[0,4,9]]\`. Sorted by weight: \`(0,1,1) (2,3,2) (0,2,3) (1,3,4) (3,4,5) (0,4,9)\`.

| Edge | Roots | Decision | \`parent\` after | \`rank\` after |
| --- | --- | --- | --- | --- |
| start | - | - | \`[0,1,2,3,4]\` | \`[0,0,0,0,0]\` |
| \`(0,1,1)\` | 0, 1 | union (equal rank, 0 becomes root) | \`[0,0,2,3,4]\` | \`[1,0,0,0,0]\` |
| \`(2,3,2)\` | 2, 3 | union (equal rank, 2 becomes root) | \`[0,0,2,2,4]\` | \`[1,0,1,0,0]\` |
| \`(0,2,3)\` | 0, 2 | union (equal rank 1, 0 becomes root, rank 2) | \`[0,0,0,2,4]\` | \`[2,0,1,0,0]\` |
| \`(1,3,4)\` | 0, 0 | **cycle, skip**; \`find(3)\` compresses 3 -> 2 -> 0 into 3 -> 0 | \`[0,0,0,0,4]\` | \`[2,0,1,0,0]\` |
| \`(3,4,5)\` | 0, 4 | union (rank 2 > 0, 4 under 0); 4 edges chosen, stop | \`[0,0,0,0,0]\` | \`[2,0,1,0,0]\` |

Total weight \`1 + 2 + 3 + 5 = 11\`. The edge \`(0,4,9)\` is never examined because the tree is already complete. Notice the rejected edge \`(1,3,4)\`: it was rejected because both ends already share root 0, and the lookup flattened vertex 3 so later finds are one step.

## Complexity

| | Time | Space | Reason |
| --- | --- | --- | --- |
| Overall | O(E log E) | O(V + E) | Sorting dominates; the union-find operations are almost constant (inverse Ackermann) each. |
| Union-find per operation | about O(1) amortised | O(V) | Path compression plus union by rank. |

## When to use it

- Sparse graphs, when edges are already in a list or can be sorted cheaply; also when the graph may be disconnected (the result is a spanning forest).
- **vs. Prim:** Prim grows one tree with a heap and is usually better on dense graphs; Kruskal is simpler to code with an edge list and union-find.
- The same union-find idea solves "number of connected components" and "redundant connection" problems.

## Common pitfalls

- Forgetting to sort the edges, or sorting by the wrong index.
- Comparing the vertices \`u\` and \`v\` instead of their **roots** to detect a cycle.
- Using \`[...edges].sort\` matters: \`sort\` changes the array in place, which would also modify the caller's input.
- Without union by rank or path compression, find can degrade to O(V) on chains.
- A disconnected graph never reaches \`n - 1\` edges; check \`mst.length\` if that is possible.

## What to watch in the visualizer

Watch \`sorted\` being consumed left to right, and \`parent\` and \`rank\` change only when an edge is accepted. In the node-link view of \`adj\` (the undirected graph), \`u\` and \`v\` mark the edge under consideration. The call stack shows \`find\` recursing up the chain and compressing it on the way back: watch \`parent[3]\` jump from 2 to 0 when the cycle edge \`(1,3,4)\` is rejected.

## Example

\`\`\`
Input: n = 5, edges = [[0, 1, 1], [2, 3, 2], [0, 2, 3], [1, 3, 4], [3, 4, 5], [0, 4, 9]]
Output: [11, [[0, 1, 1], [2, 3, 2], [0, 2, 3], [3, 4, 5]]]
\`\`\`
`;

export function buildKruskalMst(): QuestionInput {
  return {
    slug: "kruskal-mst",
    title: "Kruskal's Minimum Spanning Tree",
    difficulty: "Medium",
    tags: ["graph", "mst", "kruskal", "union-find", "greedy"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "kruskal", args: [5, [[0, 1, 1], [2, 3, 2], [0, 2, 3], [1, 3, 4], [3, 4, 5], [0, 4, 9]]], expected: [11, [[0, 1, 1], [2, 3, 2], [0, 2, 3], [3, 4, 5]]] },
      { method: "kruskal", args: [5, [[0, 1, 2], [0, 3, 6], [1, 2, 3], [1, 3, 8], [1, 4, 5], [2, 4, 7], [3, 4, 9]]], expected: [16, [[0, 1, 2], [1, 2, 3], [1, 4, 5], [0, 3, 6]]] },
      { method: "kruskal", args: [3, [[0, 1, 1], [1, 2, 2], [0, 2, 3]]], expected: [3, [[0, 1, 1], [1, 2, 2]]] },
      { method: "kruskal", args: [4, [[0, 1, 4], [1, 2, 1], [2, 3, 2]]], expected: [7, [[1, 2, 1], [2, 3, 2], [0, 1, 4]]] },
    ],
    visualHints: { adj: "graph", edges: "array" },
  };
}
