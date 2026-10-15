import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Solution {
  dijkstra(n, edges, source) {
    const adj = Array.from({ length: n }, () => []);
    for (const [u, v, w] of edges) {
      adj[u].push([v, w]);
      adj[v].push([u, w]);
    }

    const dist = new Array(n).fill(Infinity);
    dist[source] = 0;

    // min-heap ordered by distance; entries are [distance, vertex]
    const pq = new PriorityQueue((a, b) => a[0] - b[0]);
    pq.enqueue([0, source]);

    while (!pq.isEmpty()) {
      const [d, node] = pq.dequeue();
      if (d > dist[node]) continue; // stale entry: a shorter route was already found

      for (const [next, weight] of adj[node]) {
        // relaxation: is going through node shorter than the best known route to next?
        if (d + weight < dist[next]) {
          dist[next] = d + weight;
          pq.enqueue([dist[next], next]);
        }
      }
    }
    return dist;
  }
}
`;

const DESCRIPTION = `Dijkstra's algorithm finds the shortest distance from one source vertex to every other vertex in a graph whose edge weights are all non-negative. It returns an array \`dist\` where \`dist[v]\` is the cost of the cheapest path from the source to \`v\`.

## Intuition

Picture a fire spreading from the source along roads, where each road burns for as long as its weight. The fire reaches vertices in order of true distance, so the first time it reaches a vertex is by its shortest route. Dijkstra simulates this: a **min-heap** always hands back the unfinished vertex with the smallest known distance, and that distance is final, because every other route to it would have to pass through a vertex that is at least as far away and then add a non-negative weight.

That is also why **negative edges break it**: a later, longer-looking route could become cheaper after a negative edge, but Dijkstra has already declared the vertex finished and never reconsiders it.

## How it works

1. Set every \`dist\` to \`Infinity\` except \`dist[source] = 0\`, and put \`[0, source]\` in the min-heap.
2. Remove the entry with the smallest distance \`d\` for vertex \`node\`.
3. **Lazy deletion:** if \`d > dist[node]\`, this entry is stale (a better one was already processed); skip it. The heap has no decrease-key, so outdated entries are simply left in and ignored when they surface.
4. **Relaxation:** for each edge \`node -> next\` with \`weight\`, if \`d + weight < dist[next]\`, update \`dist[next]\` and push \`[dist[next], next]\`.
5. Repeat until the heap is empty and return \`dist\`.

## Walkthrough

Test case 0: \`n = 5\`, undirected edges \`[[0,1,4],[0,2,1],[2,1,2],[1,3,1],[2,3,5],[3,4,3]]\`, source \`0\`.

| Pop \`[d, node]\` | Action | \`dist\` after |
| --- | --- | --- |
| \`[0, 0]\` | relax 1 -> 4, 2 -> 1 | \`[0,4,1,Inf,Inf]\` |
| \`[1, 2]\` | relax 1 -> 3 (better than 4), 3 -> 6 | \`[0,3,1,6,Inf]\` |
| \`[3, 1]\` | relax 3 -> 4 (better than 6) | \`[0,3,1,4,Inf]\` |
| \`[4, 1]\` | stale (4 > 3), skipped | unchanged |
| \`[4, 3]\` | relax 4 -> 7 | \`[0,3,1,4,7]\` |
| \`[6, 3]\` | stale (6 > 4), skipped | unchanged |
| \`[7, 4]\` | nothing to improve | \`[0,3,1,4,7]\` |

The result is \`[0, 3, 1, 4, 7]\`. Note how vertex 1 first looked like 4 away, and was improved to 3 through vertex 2.

## Complexity

| | Time | Space | Reason |
| --- | --- | --- | --- |
| Binary heap (this code) | O((V + E) log V) | O(V + E) | Each edge can push one heap entry (log) and the heap and adjacency list store O(E) items. |
| Array instead of heap | O(V^2) | O(V) | Scanning for the minimum each round; better only for very dense graphs. |

## When to use it

- Single-source shortest paths with **non-negative** weights: road networks, network routing, game maps.
- **vs. BFS:** BFS is enough (and faster) when every edge costs the same. **vs. Bellman-Ford:** use Bellman-Ford when edges can be negative (O(V * E)). **vs. A\\*:** A\\* is Dijkstra plus a heuristic that steers toward one target.
- To get the actual route, also store a \`parent\` for each vertex whenever you relax it.

## Common pitfalls

- Negative edge weights silently give wrong answers; there is no error.
- Forgetting the stale-entry check still returns correct distances but does a lot of extra work.
- Using the heap without a comparator on arrays compares them as strings, not by distance.
- Unreachable vertices stay \`Infinity\`; handle that before using the value.
- Initialising \`dist\` to a "large" number that can overflow when you add a weight.

## What to watch in the visualizer

Follow \`pq\` (the heap) and \`dist\`: each relaxation changes one \`dist\` slot and adds a heap entry. Watch \`d\` and \`node\` after every pop, and look for the pops that hit \`continue\` (stale entries). In the node-link view of \`adj\`, \`node\` and \`next\` mark the edge being relaxed.

## Example

\`\`\`
Input: n = 5, edges = [[0, 1, 4], [0, 2, 1], [2, 1, 2], [1, 3, 1], [2, 3, 5], [3, 4, 3]], source = 0
Output: [0, 3, 1, 4, 7]
\`\`\`
`;

export function buildDijkstra(): QuestionInput {
  return {
    slug: "dijkstra",
    title: "Dijkstra's Shortest Path",
    difficulty: "Medium",
    tags: ["graph", "dijkstra", "shortest-path", "heap"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "dijkstra", args: [5, [[0, 1, 4], [0, 2, 1], [2, 1, 2], [1, 3, 1], [2, 3, 5], [3, 4, 3]], 0], expected: [0, 3, 1, 4, 7] },
      { method: "dijkstra", args: [4, [[0, 1, 1], [1, 2, 2], [0, 2, 5], [2, 3, 1]], 0], expected: [0, 1, 3, 4] },
      { method: "dijkstra", args: [3, [[0, 1, 7], [1, 2, 3]], 2], expected: [10, 3, 0] },
    ],
    visualHints: { adj: "graph", pq: "heap", edges: "array" },
  };
}
