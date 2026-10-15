import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Solution {
  buildMatrix(n, edges, directed) {
    // n x n grid of zeros: adjMatrix[u][v] === 1 means "there is an edge u -> v"
    const adjMatrix = Array.from({ length: n }, () => new Array(n).fill(0));
    for (const [u, v] of edges) {
      adjMatrix[u][v] = 1;
      if (!directed) {
        adjMatrix[v][u] = 1; // an undirected edge is stored in both directions
      }
    }
    return adjMatrix;
  }
}
`;

const DESCRIPTION = `An adjacency matrix stores a graph with \`n\` vertices as an \`n x n\` table: the cell in row \`u\` and column \`v\` is \`1\` when there is an edge from \`u\` to \`v\`, and \`0\` otherwise. The task is to build that table from a list of edges, for either a directed or an undirected graph.

## Intuition

Think of a road-distance chart at the back of an atlas: to learn whether two cities are connected you do not search anything, you jump straight to one row and one column. The matrix trades memory for that instant answer. Every possible pair of vertices gets its own cell, whether or not an edge exists, so asking "is there an edge between \`u\` and \`v\`?" is a single array lookup.

For an undirected graph the edge \`u - v\` is the same as \`v - u\`, so both \`adjMatrix[u][v]\` and \`adjMatrix[v][u]\` are set and the matrix is symmetric about its diagonal. For a directed graph only \`adjMatrix[u][v]\` is set.

## How it works

1. Create \`adjMatrix\` as \`n\` rows, each a fresh array of \`n\` zeros (a fresh array per row, never the same row repeated).
2. For every edge \`[u, v]\` set \`adjMatrix[u][v] = 1\`.
3. If the graph is undirected, also set \`adjMatrix[v][u] = 1\`.
4. Return the matrix.

## Walkthrough

Test case 0: \`n = 4\`, edges \`[[0,1], [0,2], [1,2], [2,3]]\`, undirected.

| Edge | Cells set | Matrix after the step |
| --- | --- | --- |
| start | none | \`[[0,0,0,0], [0,0,0,0], [0,0,0,0], [0,0,0,0]]\` |
| \`[0,1]\` | \`[0][1]\`, \`[1][0]\` | \`[[0,1,0,0], [1,0,0,0], [0,0,0,0], [0,0,0,0]]\` |
| \`[0,2]\` | \`[0][2]\`, \`[2][0]\` | \`[[0,1,1,0], [1,0,0,0], [1,0,0,0], [0,0,0,0]]\` |
| \`[1,2]\` | \`[1][2]\`, \`[2][1]\` | \`[[0,1,1,0], [1,0,1,0], [1,1,0,0], [0,0,0,0]]\` |
| \`[2,3]\` | \`[2][3]\`, \`[3][2]\` | \`[[0,1,1,0], [1,0,1,0], [1,1,0,1], [0,0,1,0]]\` |

Reading row 2 gives \`[1, 1, 0, 1]\`: vertex 2 is connected to 0, 1 and 3.

## Complexity

| | Time | Space | Reason |
| --- | --- | --- | --- |
| Build | O(n^2 + E) | O(n^2) | Filling the zero grid costs n^2, then each of the E edges is one or two writes. |
| Edge lookup \`u -> v\` | O(1) | - | Direct index into row \`u\`, column \`v\`. |
| List all neighbours of \`u\` | O(n) | - | The whole row must be scanned, even if \`u\` has only one neighbour. |

## When to use it

- Best for **dense** graphs (E close to n^2) and when you ask many "is there an edge?" questions, as in Floyd-Warshall or small fixed-size boards.
- Wasteful for **sparse** graphs: a graph with 10,000 vertices and 20,000 edges still needs 100,000,000 cells. Use an adjacency list instead (see the Adjacency List sample).
- Weights fit naturally: store the weight instead of \`1\` (and a sentinel such as \`0\` or \`Infinity\` for "no edge").

## Common pitfalls

- Building rows with \`new Array(n).fill(new Array(n).fill(0))\` makes every row the same array, so one write changes all rows.
- Forgetting the mirrored write \`adjMatrix[v][u]\` for undirected graphs gives a half-filled matrix and wrong traversal results.
- Vertices must be numbered \`0..n-1\`; labels like \`1..n\` need a shift by one.
- Self-loops \`[u, u]\` set a cell on the diagonal; decide whether your problem allows them.

## What to watch in the visualizer

Follow \`adjMatrix\` as a grid: watch \`u\` and \`v\` (the current edge) point at the cell being written, and notice that for an undirected graph the filled cells always mirror across the diagonal.

## Example

\`\`\`
Input: n = 4, edges = [[0, 1], [0, 2], [1, 2], [2, 3]], directed = false
Output: [[0, 1, 1, 0], [1, 0, 1, 0], [1, 1, 0, 1], [0, 0, 1, 0]]
\`\`\`
`;

export function buildAdjacencyMatrix(): QuestionInput {
  return {
    slug: "adjacency-matrix",
    title: "Adjacency Matrix",
    difficulty: "Easy",
    tags: ["graph", "adjacency-matrix", "representation"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "buildMatrix", args: [4, [[0, 1], [0, 2], [1, 2], [2, 3]], false], expected: [[0, 1, 1, 0], [1, 0, 1, 0], [1, 1, 0, 1], [0, 0, 1, 0]] },
      { method: "buildMatrix", args: [3, [[0, 1], [1, 2]], true], expected: [[0, 1, 0], [0, 0, 1], [0, 0, 0]] },
      { method: "buildMatrix", args: [3, [], false], expected: [[0, 0, 0], [0, 0, 0], [0, 0, 0]] },
    ],
    visualHints: { adjMatrix: "grid", edges: "array" },
  };
}
