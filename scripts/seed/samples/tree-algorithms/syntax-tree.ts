import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `function evaluateExpression(expr) {
  const tokens = tokenize(expr);
  let pos = 0; // index of the next unread token

  // expression := term (("+" | "-") term)*
  function parseExpression() {
    let node = parseTerm();
    while (tokens[pos] === "+" || tokens[pos] === "-") {
      const op = tokens[pos];
      pos++;
      const right = parseTerm();
      node = { val: op, left: node, right }; // left-associative: a - b - c = (a - b) - c
    }
    return node;
  }

  // term := factor (("*" | "/") factor)*
  function parseTerm() {
    let node = parseFactor();
    while (tokens[pos] === "*" || tokens[pos] === "/") {
      const op = tokens[pos];
      pos++;
      const right = parseFactor();
      node = { val: op, left: node, right };
    }
    return node;
  }

  // factor := number | "(" expression ")"
  function parseFactor() {
    const token = tokens[pos];
    pos++;
    if (token === "(") {
      const inner = parseExpression();
      pos++; // skip ")"
      return inner;
    }
    return { val: Number(token), left: null, right: null };
  }

  const ast = parseExpression();
  return [evaluate(ast), prefix(ast)];
}

// Splits "3 + 4 * (2 - 1)" into ["3", "+", "4", "*", "(", "2", "-", "1", ")"]
function tokenize(expr) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    if (expr[i] === " ") {
      i++;
    } else if (expr[i] >= "0" && expr[i] <= "9") {
      let j = i;
      while (j < expr.length && expr[j] >= "0" && expr[j] <= "9") j++;
      tokens.push(expr.slice(i, j)); // a whole multi-digit number
      i = j;
    } else {
      tokens.push(expr[i]); // operator or parenthesis
      i++;
    }
  }
  return tokens;
}

// Post-order: evaluate both operands, then apply the operator
function evaluate(node) {
  if (node.left === null) return node.val; // number leaf
  const a = evaluate(node.left);
  const b = evaluate(node.right);
  if (node.val === "+") return a + b;
  if (node.val === "-") return a - b;
  if (node.val === "*") return a * b;
  return a / b;
}

// Pre-order: operator first, then its operands (Polish notation)
function prefix(node) {
  if (node.left === null) return String(node.val);
  return node.val + " " + prefix(node.left) + " " + prefix(node.right);
}
`;

const DESCRIPTION = `An **abstract syntax tree (AST)** represents the structure of an expression or program: operators become internal nodes and operands become their children. Compilers, interpreters, linters, formatters and spreadsheet engines all parse source text into an AST first, then walk it. This sample parses an arithmetic expression such as \`3 + 4 * (2 - 1)\` with a **recursive-descent parser** that respects operator precedence and parentheses, evaluates the AST with a **post-order** walk, and prints it in **prefix** (Polish) notation with a pre-order walk.

## Intuition

Precedence is just nesting. Write the grammar so that each precedence level is its own rule, and lower-precedence rules are built out of higher-precedence ones:

\`\`\`
expression := term   (("+" | "-") term)*      lowest precedence
term       := factor (("*" | "/") factor)*
factor     := number | "(" expression ")"      highest precedence
\`\`\`

A \`term\` swallows every \`*\` and \`/\` it can before \`expression\` ever sees a \`+\`, so in \`3 + 4 * 2\` the product \`4 * 2\` becomes one subtree under the \`+\`. Parentheses restart at the lowest level, so whatever is inside them becomes a single factor. Each grammar rule turns into one function, hence "recursive descent".

Once the tree exists, evaluation is natural in **post-order** (children before parent): you cannot apply \`*\` until both operands are known.

## How it works

1. **Tokenize:** scan the string; skip spaces, group consecutive digits into one number token, and emit every other character (\`+ - * / ( )\`) as its own token.
2. **parseExpression:** parse a term; while the next token is \`+\` or \`-\`, consume it, parse another term, and make a new node \`{ val: op, left: node, right }\`. Looping (instead of recursing on the right) makes \`8 - 3 - 2\` group as \`(8 - 3) - 2\`.
3. **parseTerm:** the same with \`*\` and \`/\`, built from factors.
4. **parseFactor:** a number becomes a leaf; \`(\` parses a full expression and then skips the closing \`)\`.
5. **evaluate (post-order):** a leaf returns its number; an operator node evaluates its left and right subtrees, then applies itself.
6. **prefix (pre-order):** a leaf prints its number; an operator node prints itself, then its left and right subtrees.

## Walkthrough

Case 0: \`expr = "3 + 4 * (2 - 1)"\`.

\`\`\`
tokens: ["3", "+", "4", "*", "(", "2", "-", "1", ")"]
         0    1    2    3    4    5    6    7    8      (pos values)

parseExpression
  parseTerm -> parseFactor reads "3" (pos 0)          leaf 3
  sees "+" (pos 1), consumes it
  parseTerm
    parseFactor reads "4" (pos 2)                     leaf 4
    sees "*" (pos 3), consumes it
    parseFactor reads "(" (pos 4)
      parseExpression
        parseTerm -> leaf 2 (pos 5)
        sees "-" (pos 6) -> parseTerm -> leaf 1 (pos 7)
        node (2 - 1)
      skip ")" (pos 8)
    node 4 * (2 - 1)
  node 3 + (4 * (2 - 1))
\`\`\`

\`\`\`
      +
     / \\
    3   *
       / \\
      4   -
         / \\
        2   1
\`\`\`

\`\`\`
evaluate (post-order): 2 - 1 = 1;  4 * 1 = 4;  3 + 4 = 7
prefix   (pre-order):  "+ 3 * 4 - 2 1"
result:  [7, "+ 3 * 4 - 2 1"]
\`\`\`

## Complexity

| Step | Time | Space | Why |
|------|------|-------|-----|
| tokenize | O(n) | O(n) | one pass over the n characters |
| parse | O(t) | O(t) | each of the t tokens is consumed once; recursion depth follows parenthesis nesting |
| evaluate | O(t) | O(h) | each AST node is visited once; h = tree height |
| prefix | O(t · h) | O(t) | string concatenation copies partial strings; collecting parts in an array makes it O(t) |

## When to use it

- **Recursive descent:** the easiest parser to write by hand, gives clear error messages, and handles most programming-language grammars (it is what V8, TypeScript and GCC's C++ front end use).
- **vs. shunting-yard (Dijkstra):** a stack-based algorithm that converts infix to postfix without recursion; compact for pure expressions, harder to extend to statements.
- **vs. Pratt parsing (precedence climbing):** one loop driven by a precedence table instead of one function per level; scales better to many operators.
- **vs. parser generators (ANTLR, yacc):** generate the parser from a grammar file; worth it for large languages.
- **Why build an AST instead of evaluating while parsing:** the same tree can be evaluated, printed, optimized (constant folding), type-checked or compiled.

## Common pitfalls

- Writing \`expression := term "+" expression\` (right recursion): it makes \`-\` and \`/\` right-associative, so \`8 - 3 - 2\` becomes \`8 - (3 - 2) = 7\` instead of \`3\`.
- Left recursion (\`expression := expression "+" term\`) translated literally into a function: infinite recursion. Use a loop.
- Forgetting to consume the closing \`)\` (or not checking it is there): later tokens are misread.
- Tokenizing digit by digit: \`12\` must be one token.
- Unary minus (\`-3\`) and division by zero need explicit handling; this sample supports neither.

## What to watch in the visualizer

- \`tokens\` is shown as an array and \`pos\` moves along it as the parser consumes tokens; in \`tokenize\`, \`i\` and \`j\` scan the input string.
- The call stack shows the grammar in action: \`parseExpression → parseTerm → parseFactor → parseExpression\` when a parenthesis opens.
- \`node\` and \`ast\` are drawn as trees and grow as operators are attached.
- During \`evaluate\`, \`a\` and \`b\` hold operand values coming back up the tree.

## Example

\`\`\`
Input: expr = "3 + 4 * (2 - 1)"
Output: [7, "+ 3 * 4 - 2 1"]
\`\`\`

## Constraints

- \`expr\` contains non-negative integers, \`+ - * /\`, parentheses and spaces, and is a valid expression.
- No unary minus; division is real division.
`;

export function buildSyntaxTree(): QuestionInput {
  return {
    slug: "syntax-tree",
    title: "Expression Syntax Tree (Parse and Evaluate)",
    difficulty: "Medium",
    tags: ["tree", "parsing", "recursion", "expression"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      { method: "evaluateExpression", args: ["3 + 4 * (2 - 1)"], expected: [7, "+ 3 * 4 - 2 1"] },
      { method: "evaluateExpression", args: ["(1 + 2) * 3 - 4 / 2"], expected: [7, "- * + 1 2 3 / 4 2"] },
      // left associativity: (8 - 3) - 2
      { method: "evaluateExpression", args: ["8 - 3 - 2"], expected: [3, "- - 8 3 2"] },
      { method: "evaluateExpression", args: ["((42))"], expected: [42, "42"] },
    ],
    visualHints: {
      ast: "tree",
    },
  };
}
