import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Solution {
  canFinish(numCourses, prerequisites) {
    const adj = Array.from({ length: numCourses }, () => []);
    for (const [course, pre] of prerequisites) {
      adj[pre].push(course);
    }
    const visiting = new Set();
    const visited = new Set();
    const hasCycle = (node) => {
      if (visiting.has(node)) return true;
      if (visited.has(node)) return false;
      visiting.add(node);
      for (const next of adj[node]) {
        if (hasCycle(next)) return true;
      }
      visiting.delete(node);
      visited.add(node);
      return false;
    };
    for (let course = 0; course < numCourses; course++) {
      if (hasCycle(course)) return false;
    }
    return true;
  }
}
`;

const DESCRIPTION = `There are \`numCourses\` courses labelled \`0\` to \`numCourses - 1\`. Each \`prerequisites[i] = [a, b]\` means you must take course \`b\` before course \`a\`.

Return \`true\` if you can finish all courses, otherwise \`false\`. This is cycle detection in a directed graph.

## Example

\`\`\`
Input: numCourses = 4, prerequisites = [[1, 0], [2, 1], [3, 2]]
Output: true
\`\`\`

## Constraints

- \`1 <= numCourses <= 2000\`
- \`0 <= prerequisites.length <= 5000\`
- All the pairs are unique.
`;

export function buildCourseSchedule(): QuestionInput {
  return {
    slug: "course-schedule",
    title: "Course Schedule",
    difficulty: "Medium",
    tags: ["graph", "dfs", "topological-sort"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "canFinish", args: [4, [[1, 0], [2, 1], [3, 2]]], expected: true },
      { method: "canFinish", args: [3, [[1, 0], [2, 1], [0, 2]]], expected: false },
      { method: "canFinish", args: [4, [[1, 0], [2, 0], [3, 1], [3, 2]]], expected: true },
    ],
    visualHints: {},
  };
}
