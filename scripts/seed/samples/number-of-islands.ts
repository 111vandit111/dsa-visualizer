import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Solution {
  numIslands(grid) {
    const rows = grid.length;
    const cols = grid[0].length;
    const visited = grid.map((row) => row.map(() => false));
    const dfs = (r, c) => {
      if (r < 0 || c < 0 || r >= rows || c >= cols) return;
      if (grid[r][c] !== "1" || visited[r][c]) return;
      visited[r][c] = true;
      dfs(r + 1, c);
      dfs(r - 1, c);
      dfs(r, c + 1);
      dfs(r, c - 1);
    };
    let count = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === "1" && !visited[r][c]) {
          count++;
          dfs(r, c);
        }
      }
    }
    return count;
  }
}
`;

const DESCRIPTION = `Given an \`m x n\` grid of \`"1"\` (land) and \`"0"\` (water), return the number of islands. An island is surrounded by water and formed by connecting adjacent land cells horizontally or vertically.

## Example

\`\`\`
Input: grid = [
  ["1","1","0","0"],
  ["1","1","0","0"],
  ["0","0","1","0"],
  ["0","0","0","1"]
]
Output: 3
\`\`\`

## Constraints

- \`1 <= m, n <= 300\`
- \`grid[i][j]\` is \`"0"\` or \`"1"\`.
`;

export function buildNumberOfIslands(): QuestionInput {
  return {
    slug: "number-of-islands",
    title: "Number of Islands",
    difficulty: "Medium",
    tags: ["grid", "dfs", "matrix"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "numIslands", args: [[["1", "1", "0", "0"], ["1", "1", "0", "0"], ["0", "0", "1", "0"], ["0", "0", "0", "1"]]], expected: 3 },
      { method: "numIslands", args: [[["1", "1", "1"], ["0", "1", "0"], ["1", "1", "1"]]], expected: 1 },
      { method: "numIslands", args: [[["0", "0"], ["0", "0"]]], expected: 0 },
    ],
    visualHints: {},
  };
}
