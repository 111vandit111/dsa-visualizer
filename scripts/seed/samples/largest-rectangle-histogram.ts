import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Solution {
  largestRectangleArea(heights) {
    const stack = [];
    let best = 0;
    for (let i = 0; i <= heights.length; i++) {
      const h = i === heights.length ? 0 : heights[i];
      while (stack.length > 0 && heights[stack[stack.length - 1]] >= h) {
        const height = heights[stack.pop()];
        const left = stack.length === 0 ? -1 : stack[stack.length - 1];
        best = Math.max(best, height * (i - left - 1));
      }
      stack.push(i);
    }
    return best;
  }
}
`;

const DESCRIPTION = `Given an array of integers \`heights\` representing a histogram where each bar has width \`1\`, return the area of the largest rectangle in the histogram.

## Example

\`\`\`
Input: heights = [2, 1, 5, 6, 2, 3]
Output: 10
\`\`\`

## Constraints

- \`1 <= heights.length <= 10^5\`
- \`0 <= heights[i] <= 10^4\`
`;

export function buildLargestRectangleHistogram(): QuestionInput {
  return {
    slug: "largest-rectangle-histogram",
    title: "Largest Rectangle in Histogram",
    difficulty: "Hard",
    tags: ["array", "stack", "monotonic-stack"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "largestRectangleArea", args: [[2, 1, 5, 6, 2, 3]], expected: 10 },
      { method: "largestRectangleArea", args: [[2, 4]], expected: 4 },
      { method: "largestRectangleArea", args: [[3, 6, 5, 7, 4, 8, 1]], expected: 20 },
    ],
    visualHints: {},
  };
}
