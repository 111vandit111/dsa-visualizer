import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `function levelOrderTraversal(values) {
  const root = buildTree(values);
  const levels = [];
  if (root === null) return levels;

  const queue = [root];
  while (queue.length > 0) {
    // Everything currently in the queue belongs to ONE level.
    const levelSize = queue.length;
    const level = [];
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift();
      level.push(node.val);
      if (node.left !== null) queue.push(node.left);
      if (node.right !== null) queue.push(node.right);
    }
    levels.push(level);
  }
  return levels;
}

// Build a binary tree from a level-order array (null = missing child).
function buildTree(values) {
  const nodes = values.map((v) => (v === null ? null : new TreeNode(v)));
  let next = 1;
  for (const node of nodes) {
    if (node === null) continue;
    if (next < nodes.length) node.left = nodes[next++];
    if (next < nodes.length) node.right = nodes[next++];
  }
  return nodes.length > 0 ? nodes[0] : null;
}
`;

const DESCRIPTION = `**Level-order traversal** visits a binary tree one level (depth) at a time, from the root downwards and from left to right inside each level, and returns the values grouped per level. Unlike the other traversals it is a **breadth-first search** driven by a queue instead of recursion. The tree is passed as a level-order array and built into nodes inside the function.

## Intuition

Think of ripples spreading on a pond: first the centre, then the ring around it, then the next ring. A queue (first in, first out) gives exactly that behaviour: children are added at the back while their parents are processed at the front, so every node of depth \`d\` leaves the queue before any node of depth \`d + 1\`.

The trick for grouping is \`levelSize = queue.length\` at the start of each round: at that moment the queue holds exactly the nodes of one level, and everything appended during the round belongs to the next level.

## How it works

1. If the tree is empty, return \`[]\`.
2. Put \`root\` into \`queue\`.
3. While the queue is not empty:
   1. \`levelSize = queue.length\` (the number of nodes in this level).
   2. Repeat \`levelSize\` times: take a node from the front, record its value in \`level\`, and append its non-null children to the back.
   3. Push \`level\` onto \`levels\`.
4. Return \`levels\`.

## Walkthrough

Test case 0, tree \`[1, 2, 3, 4, 5, null, 6]\`:

\`\`\`
        1
       / \\
      2   3
     / \\   \\
    4   5   6
\`\`\`

| Round | \`queue\` at start | Nodes taken | \`level\` | \`queue\` at end |
|-------|------------------|-------------|---------|----------------|
| 1 | \`[1]\` | 1 | \`[1]\` | \`[2, 3]\` |
| 2 | \`[2, 3]\` | 2, 3 | \`[2, 3]\` | \`[4, 5, 6]\` (2 adds 4 and 5, 3 adds only 6) |
| 3 | \`[4, 5, 6]\` | 4, 5, 6 | \`[4, 5, 6]\` | \`[]\` |

Result: \`[[1], [2, 3], [4, 5, 6]]\`.

## Complexity

| Measure | Cost | Why |
|---------|------|-----|
| Time | O(n) | Each node is enqueued and dequeued once (\`queue.shift()\` is O(n) on a JavaScript array in theory, but engines make it cheap; a head index gives strict O(1)) |
| Space | O(w) | The queue holds at most one level, \`w\` = the widest level (up to about n / 2 for a complete tree) |

## When to use it

- Anything about depth or levels: minimum depth, right-side view, zigzag order, connecting nodes on the same level, shortest path in an unweighted tree or graph.
- vs. **DFS orders** (pre/in/post): BFS needs O(width) memory instead of O(height); on bushy trees that can be much larger.
- It generalizes directly to graphs (BFS with a \`visited\` set).

## Common pitfalls

- Reading \`queue.length\` inside the \`for\` condition: it changes while you append children, so the level boundary is lost. Capture it in \`levelSize\` first.
- Enqueueing \`null\` children and then crashing on \`node.val\`.
- Forgetting the empty-tree check.
- Using a stack instead of a queue turns the traversal into a (reversed-sibling) DFS.

## What to watch in the visualizer

- The \`queue\` variable: nodes enter at the back and leave from the front.
- \`levelSize\` fixing how many nodes belong to the current level.
- \`levels\` receiving one inner array per outer loop round.

## Example

\`\`\`
Input:  root = [1, 2, 3, 4, 5, null, 6]
Output: [[1], [2, 3], [4, 5, 6]]
\`\`\`
`;

export function buildLevelOrderTraversal(): QuestionInput {
  return {
    slug: "level-order-traversal",
    title: "Level Order Traversal",
    difficulty: "Medium",
    tags: ["tree", "traversal", "bfs", "queue"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        method: "levelOrderTraversal",
        args: [[1, 2, 3, 4, 5, null, 6]],
        expected: [[1], [2, 3], [4, 5, 6]],
      },
      {
        method: "levelOrderTraversal",
        args: [[1, null, 2, 3]],
        expected: [[1], [2], [3]],
      },
      {
        method: "levelOrderTraversal",
        args: [[]],
        expected: [],
      },
      {
        method: "levelOrderTraversal",
        args: [[7]],
        expected: [[7]],
      },
    ],
    visualHints: { root: "tree" },
  };
}
