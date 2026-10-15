import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Solution {
  evaluatePrefix(tokens) {
    const stack = [];
    // Scan right to left so that operands are on the stack before their operator.
    for (let i = tokens.length - 1; i >= 0; i--) {
      const token = tokens[i];
      if (this.isOperator(token)) {
        // The left operand was pushed last, so it is popped first.
        const left = stack.pop();
        const right = stack.pop();
        stack.push(this.apply(token, left, right));
      } else {
        stack.push(Number(token)); // operand: just remember it
      }
    }
    return stack.pop(); // the single value left is the answer
  }

  isOperator(token) {
    return token === "+" || token === "-" || token === "*" || token === "/";
  }

  apply(operator, left, right) {
    if (operator === "+") return left + right;
    if (operator === "-") return left - right;
    if (operator === "*") return left * right;
    return Math.trunc(left / right); // integer division
  }
}
`;

const DESCRIPTION = `Prefix notation (Polish notation) writes the operator **before** its operands: \`+ 2 3\` means \`2 + 3\`. Like postfix, it needs no parentheses. A stack evaluates it with one pass from **right to left**: operands are pushed, and each operator pops two operands and pushes the result.

## Intuition

In \`- + 2 * 3 1 9\` every operator is followed by the expressions it applies to. If we read the tokens backwards, the operands of an operator are always seen *before* the operator itself, which is the same situation as in postfix. So the only change from postfix evaluation is the scan direction, and the operand order.

The invariant: **after processing token \`i\` (moving leftwards), the stack holds the values of the complete sub-expressions that start at index \`i\` or later.**

## How it works

1. Create an empty \`stack\` and walk the tokens with \`i = n - 1\` down to \`0\`.
2. If \`tokens[i]\` is a number, convert it and push it.
3. If it is an operator, pop \`left\` first and then \`right\`. Scanning backwards reverses the order compared with postfix.
4. Compute \`left operator right\` and push the result.
5. After \`i = 0\`, the last remaining value is the answer.

## Walkthrough

Test case 0: \`tokens = ["-", "+", "2", "*", "3", "1", "9"]\`, which is \`(2 + 3 * 1) - 9\`.

| i | token | Action | Stack (bottom to top) |
|---|-------|--------|-----------------------|
| 6 | 9 | push | \`[9]\` |
| 5 | 1 | push | \`[9, 1]\` |
| 4 | 3 | push | \`[9, 1, 3]\` |
| 3 | * | left = 3, right = 1: 3 * 1 = 3 | \`[9, 3]\` |
| 2 | 2 | push | \`[9, 3, 2]\` |
| 1 | + | left = 2, right = 3: 2 + 3 = 5 | \`[9, 5]\` |
| 0 | - | left = 5, right = 9: 5 - 9 = -4 | \`[-4]\` |

## Complexity

| Case | Time | Why |
|------|------|-----|
| Best / Average / Worst | O(n) | one pass, each token pushed and popped at most once |
| Space | O(n) | the stack holds pending operands |

## When to use it

- Evaluating or interpreting expression trees written in prefix form (Lisp-style \`(+ 1 2)\` is essentially prefix).
- Prefix is the order of a pre-order traversal of an expression tree; postfix is the post-order.
- Compared with postfix: same cost, but you must scan from the right. Postfix is more common in calculators because it can be evaluated while the input is still being typed.

## Common pitfalls

- Reusing the postfix operand order: when scanning right to left, the **first** pop is the *left* operand. Swapping them breaks \`-\` and \`/\`.
- Scanning left to right: the operator would arrive before its operands exist.
- Forgetting \`Number()\` on operand tokens, which are strings.
- Using \`Math.floor\` instead of \`Math.trunc\` for integer division of negative numbers.

## What to watch in the visualizer

- The pointer \`i\` moves from the **end** of \`tokens\` towards the start.
- Numbers pile up on the \`stack\`; whenever the pointer lands on an operator, two values leave and one result arrives.
- Check the locals \`left\` and \`right\` on each operator step to confirm which came off first.
- The last step leaves a single value on the stack: the result.

## Example

\`\`\`
Input: tokens = ["-", "+", "2", "*", "3", "1", "9"]
Output: -4
\`\`\`
`;

export function buildPrefixEvaluation(): QuestionInput {
  return {
    slug: "prefix-evaluation",
    title: "Prefix Expression Evaluation",
    difficulty: "Medium",
    tags: ["stack", "expression", "prefix"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "evaluatePrefix", args: [["-", "+", "2", "*", "3", "1", "9"]], expected: -4 },
      { method: "evaluatePrefix", args: [["+", "4", "/", "13", "5"]], expected: 6 },
      { method: "evaluatePrefix", args: [["7"]], expected: 7 },
    ],
    visualHints: { tokens: "array", stack: "array" },
  };
}
