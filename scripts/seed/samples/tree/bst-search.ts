import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `// Returns the values visited while searching for \`target\`.
// If the last value in the path equals \`target\`, it was found.
function bstSearch(values, target) {
  const root = buildBst(values);
  const path = [];

  let curr = root;
  while (curr !== null) {
    path.push(curr.val);
    if (target === curr.val) {
      return path; // found
    }
    // Discard the half that cannot contain the target.
    if (target < curr.val) {
      curr = curr.left;
    } else {
      curr = curr.right;
    }
  }
  return path; // fell off the tree: not present
}

function buildBst(values) {
  let root = null;
  for (const value of values) {
    const node = new TreeNode(value);
    if (root === null) {
      root = node;
      continue;
    }
    let curr = root;
    while (true) {
      if (value < curr.val) {
        if (curr.left === null) {
          curr.left = node;
          break;
        }
        curr = curr.left;
      } else {
        if (curr.right === null) {
          curr.right = node;
          break;
        }
        curr = curr.right;
      }
    }
  }
  return root;
}
`;

const DESCRIPTION = `**Searching a binary search tree** uses the ordering of the tree to throw away half of the remaining values at each step. This sample builds a BST from the given insertion order, then searches for \`target\` **iteratively** and returns the **path of values it visited**. If the path ends with the target it was found; otherwise the search fell off the tree.

## Intuition

At each node there are three outcomes: the target equals the node's value (done), it is smaller (everything larger is in the right subtree, so ignore it) or it is larger (ignore the left subtree). It is binary search, except that the "middle" is the current node and the array is replaced by pointers.

Invariant: if the target exists in the tree, it is in the subtree rooted at \`curr\`. Each step keeps that true while shrinking the subtree, so the walk either reaches the target or ends at a \`null\` child that proves it is absent.

## How it works

1. Start at the root: \`curr = root\` with an empty \`path\`.
2. While \`curr\` is not \`null\`:
   1. Append \`curr.val\` to \`path\`.
   2. If \`target === curr.val\`, return \`path\` (found).
   3. If \`target < curr.val\`, move to \`curr.left\`; otherwise move to \`curr.right\`.
3. If the loop ends because \`curr\` is \`null\`, the value is not in the tree: return the path anyway (its last value is where the target would be inserted below).

## Walkthrough

Test case 0 builds the BST from \`[8, 3, 10, 1, 6, 14, 4, 7, 13]\` and searches for \`6\`:

\`\`\`
          8
        /   \\
       3     10
      / \\      \\
     1   6      14
        / \\     /
       4   7   13
\`\`\`

| Step | \`curr\` | Compare | Move | \`path\` |
|------|--------|---------|------|--------|
| 1 | 8 | 6 < 8 | left | \`[8]\` |
| 2 | 3 | 6 > 3 | right | \`[8, 3]\` |
| 3 | 6 | 6 === 6 | found, return | \`[8, 3, 6]\` |

Other cases: searching for \`5\` returns \`[8, 3, 6, 4]\` (it falls off the tree below 4, so 5 is absent); searching for \`13\` returns \`[8, 10, 14, 13]\`.

## Complexity

| Measure | Cost | Why |
|---------|------|-----|
| Time, average | O(log n) | Each step discards a whole subtree of a balanced tree |
| Time, worst | O(n) | A degenerate (chain-like) tree has height n |
| Space | O(1) | Iterative: one pointer (plus the \`path\` output) |

## When to use it

- Fast membership, predecessor/successor and range queries on ordered data.
- The iterative form avoids recursion overhead and stack growth; the recursive form is a bit shorter.
- vs. a hash table: BST search is slower on average, but the data stays sorted, so you also get ordered traversal and range queries.

## Common pitfalls

- Comparing in the wrong direction (going right for smaller values).
- Dereferencing \`curr.val\` when \`curr\` is \`null\`; the loop condition must test it first.
- Searching a tree that is not really a BST: the ordering assumption silently gives wrong answers.
- Assuming O(log n): a tree built from sorted input has height n.

## What to watch in the visualizer

- The \`curr\` pointer descending one level per iteration, always away from the discarded side.
- \`path\` growing by one value per step, matching the highlighted route from the root.
- The two ways out of the loop: an early \`return\` when found, or \`curr\` becoming \`null\`.

## Example

\`\`\`
Input:  values = [8, 3, 10, 1, 6, 14, 4, 7, 13], target = 6
Output: [8, 3, 6]
\`\`\`
`;

export function buildBstSearch(): QuestionInput {
  return {
    slug: "bst-search",
    title: "BST Search",
    difficulty: "Easy",
    tags: ["tree", "bst", "searching"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        method: "bstSearch",
        args: [[8, 3, 10, 1, 6, 14, 4, 7, 13], 6],
        expected: [8, 3, 6],
      },
      {
        method: "bstSearch",
        args: [[8, 3, 10, 1, 6, 14, 4, 7, 13], 13],
        expected: [8, 10, 14, 13],
      },
      {
        method: "bstSearch",
        args: [[8, 3, 10, 1, 6, 14, 4, 7, 13], 5],
        expected: [8, 3, 6, 4],
      },
      {
        method: "bstSearch",
        args: [[], 1],
        expected: [],
      },
    ],
    visualHints: { root: "tree" },
  };
}
