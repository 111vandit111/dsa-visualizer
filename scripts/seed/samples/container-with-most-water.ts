import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Solution {
  maxArea(height) {
    let left = 0;
    let right = height.length - 1;
    let best = 0;
    while (left < right) {
      const area = Math.min(height[left], height[right]) * (right - left);
      best = Math.max(best, area);
      if (height[left] < height[right]) left++;
      else right--;
    }
    return best;
  }
}
`;

const DESCRIPTION = `Given an integer array \`height\`, where \`height[i]\` is the height of a vertical line at position \`i\`, pick two lines that together with the x-axis hold the most water. Return that maximum amount.

## Example

\`\`\`
Input: height = [1, 8, 6, 2, 5, 4, 8, 3, 7]
Output: 49
\`\`\`

## Constraints

- \`2 <= height.length <= 10^5\`
- \`0 <= height[i] <= 10^4\`
`;

export function buildContainerWithMostWater(): QuestionInput {
  return {
    slug: "container-with-most-water",
    title: "Container With Most Water",
    difficulty: "Medium",
    tags: ["array", "two-pointers", "greedy"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "maxArea", args: [[1, 8, 6, 2, 5, 4, 8, 3, 7]], expected: 49 },
      { method: "maxArea", args: [[1, 1]], expected: 1 },
      { method: "maxArea", args: [[4, 3, 2, 1, 4]], expected: 16 },
    ],
    visualHints: {},
  };
}
