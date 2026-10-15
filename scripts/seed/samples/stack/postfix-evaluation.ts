import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Solution {
  evaluatePostfix(tokens) {
    const stack = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (this.isOperator(token)) {
        // The right operand was pushed last, so it is popped first.
        const right = stack.pop();
        const left = stack.pop();
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

const DESCRIPTION = `Postfix notation (reverse Polish notation) writes the operator **after** its operands: \`2 3 +\` means \`2 + 3\`. It needs no parentheses and no precedence rules. A stack evaluates a postfix expression in a single left-to-right pass: operands are pushed, and each operator pops its two operands and pushes the result.

## Intuition

When you read \`2 3 1 * + 9 -\` from left to right, an operator always applies to the **two most recent results**. "Most recent" is exactly what a stack gives you. Numbers wait on the stack until an operator arrives, then collapse into one value that waits in turn.

The invariant: **after processing token \`i\`, the stack holds the values of all complete sub-expressions seen so far, in order.** For a valid expression, exactly one value remains at the end.

## How it works

1. Create an empty \`stack\` and walk the tokens with \`i = 0 .. n - 1\`.
2. If \`tokens[i]\` is a number, convert it and push it.
3. If it is an operator, pop \`right\` first and then \`left\` (order matters for \`-\` and \`/\`).
4. Compute \`left operator right\` and push the result.
5. After the last token, pop the one remaining value and return it.

## Walkthrough

Test case 0: \`tokens = ["2", "3", "1", "*", "+", "9", "-"]\`, which is \`2 + 3 * 1 - 9\`.

| i | token | Action | Stack (bottom to top) |
|---|-------|--------|-----------------------|
| 0 | 2 | push | \`[2]\` |
| 1 | 3 | push | \`[2, 3]\` |
| 2 | 1 | push | \`[2, 3, 1]\` |
| 3 | * | 3 * 1 = 3 | \`[2, 3]\` |
| 4 | + | 2 + 3 = 5 | \`[5]\` |
| 5 | 9 | push | \`[5, 9]\` |
| 6 | - | 5 - 9 = -4 | \`[-4]\` |

The answer is the last remaining value, \`-4\`.

## Complexity

| Case | Time | Why |
|------|------|-----|
| Best / Average / Worst | O(n) | each token is pushed and popped at most once |
| Space | O(n) | the stack can hold up to about n / 2 operands (for example \`1 2 3 4 + + +\`) |

## When to use it

- Evaluating expressions without parsing precedence; calculators, compilers and virtual machines often convert infix to postfix first (the shunting-yard algorithm) and then run this loop.
- It is the mirror image of prefix evaluation, which scans from the right.
- For infix input with parentheses you need the conversion step, or a two-stack algorithm.

## Common pitfalls

- Popping the operands in the wrong order: for \`-\` and \`/\` the **first** pop is the right operand, not the left.
- Treating tokens as strings: \`"3" + "1"\` concatenates. Convert operands with \`Number\`.
- Integer division: \`Math.trunc\` rounds toward zero (\`-7 / 2\` gives \`-3\`), while \`Math.floor\` would give \`-4\`.
- Not handling a stack with fewer than two values (an invalid expression) pops \`undefined\`.

## What to watch in the visualizer

- \`tokens\` is shown as bars/cells with the pointer \`i\` moving one step to the right per token.
- The \`stack\` array grows on operands and shrinks by one on every operator (two pops, one push).
- On an operator step, look at the locals \`left\` and \`right\` to see the order the operands came off the stack.
- The final \`stack.pop()\` returns the answer.

## Example

\`\`\`
Input: tokens = ["2", "3", "1", "*", "+", "9", "-"]
Output: -4
\`\`\`
`;

export function buildPostfixEvaluation(): QuestionInput {
  return {
    slug: "postfix-evaluation",
    title: "Postfix Expression Evaluation",
    difficulty: "Medium",
    tags: ["stack", "expression", "postfix"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "evaluatePostfix", args: [["2", "3", "1", "*", "+", "9", "-"]], expected: -4 },
      { method: "evaluatePostfix", args: [["4", "13", "5", "/", "+"]], expected: 6 },
      { method: "evaluatePostfix", args: [["7"]], expected: 7 },
    ],
    visualHints: { tokens: "array", stack: "array" },
  };
}
