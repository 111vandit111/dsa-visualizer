import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Solution {
  lengthOfLongestSubstring(s) {
    const seen = new Map();
    let left = 0;
    let best = 0;
    for (let right = 0; right < s.length; right++) {
      const ch = s[right];
      if (seen.has(ch) && seen.get(ch) >= left) {
        left = seen.get(ch) + 1;
      }
      seen.set(ch, right);
      best = Math.max(best, right - left + 1);
    }
    return best;
  }
}
`;

const DESCRIPTION = `Given a string \`s\`, find the length of the longest substring without repeating characters.

## Example

\`\`\`
Input: s = "abcabcbb"
Output: 3
\`\`\`

The answer is \`"abc"\`, with length 3.

## Constraints

- \`0 <= s.length <= 5 * 10^4\`
- \`s\` consists of English letters, digits, symbols and spaces.
`;

export function buildLongestSubstringNoRepeat(): QuestionInput {
  return {
    slug: "longest-substring-no-repeat",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    tags: ["string", "hash-table", "sliding-window"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "lengthOfLongestSubstring", args: ["abcabcbb"], expected: 3 },
      { method: "lengthOfLongestSubstring", args: ["bbbbb"], expected: 1 },
      { method: "lengthOfLongestSubstring", args: ["pwwkew"], expected: 3 },
    ],
    visualHints: {},
  };
}
