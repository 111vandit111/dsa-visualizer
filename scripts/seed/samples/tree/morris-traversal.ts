import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `function morrisInorder(values) {
  const root = buildTree(values);
  const result = [];

  let curr = root;
  while (curr !== null) {
    if (curr.left === null) {
      // Nothing on the left: visit curr, then move right (maybe along a thread).
      result.push(curr.val);
      curr = curr.right;
    } else {
      // Find the in-order predecessor: the rightmost node of the left subtree.
      let pred = curr.left;
      while (pred.right !== null && pred.right !== curr) {
        pred = pred.right;
      }
      if (pred.right === null) {
        // First visit: create a thread back to curr, then go left.
        pred.right = curr;
        curr = curr.left;
      } else {
        // Second visit: the thread exists. Remove it, visit curr, go right.
        pred.right = null;
        result.push(curr.val);
        curr = curr.right;
      }
    }
  }
  return result;
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

const DESCRIPTION = `**Morris traversal** performs an inorder walk of a binary tree using **O(1) extra space**: no recursion and no stack. It does this by temporarily rewriting the tree: the empty \`right\` pointer of each node's inorder predecessor is turned into a **thread** that points back up to the node, and the thread is removed again after it has been used. The tree is passed as a level-order array and built into nodes inside the function.

## Intuition

Recursive and stack-based inorder both need memory to remember "where do I go back to after finishing the left subtree?". That place is always the same: the node whose left subtree we are in. Its **inorder predecessor** (the rightmost node of its left subtree) is the *last* node visited in that left subtree, and its \`right\` pointer is \`null\`. Morris borrows that spare pointer to store the way back: \`pred.right = curr\`.

When we later arrive at \`curr\` again via that thread, we know the left subtree is complete (we must have just finished \`pred\`), so we cut the thread (restoring the tree), visit \`curr\`, and go right.

Invariant: at any moment the tree differs from the original only by threads on the path from the root to \`curr\`; after the traversal all threads are gone.

## How it works

1. Set \`curr = root\`. Repeat while \`curr\` is not \`null\`:
2. **No left child:** record \`curr.val\` and move to \`curr.right\`. (This may follow a thread up to an ancestor.)
3. **Has a left child:** find \`pred\`, starting at \`curr.left\` and going right while \`pred.right\` is not \`null\` and not \`curr\`.
   - **\`pred.right === null\` (first visit):** create the thread \`pred.right = curr\`, then go left (\`curr = curr.left\`).
   - **\`pred.right === curr\` (second visit):** the left subtree is finished. Remove the thread (\`pred.right = null\`), record \`curr.val\`, and go right.

## Walkthrough

Test case 0, tree \`[1, 2, 3, 4, 5, null, 6]\`:

\`\`\`
        1
       / \\
      2   3
     / \\   \\
    4   5   6
\`\`\`

| \`curr\` | \`pred\` | Action | \`result\` |
|--------|--------|--------|----------|
| 1 | 5 | \`5.right\` is null: create thread 5 -> 1, go left to 2 | \`[]\` |
| 2 | 4 | \`4.right\` is null: create thread 4 -> 2, go left to 4 | \`[]\` |
| 4 | - | no left child: record 4, go right (follows the thread to 2) | \`[4]\` |
| 2 | 4 | thread found: remove it, record 2, go right to 5 | \`[4, 2]\` |
| 5 | - | no left child: record 5, go right (follows the thread to 1) | \`[4, 2, 5]\` |
| 1 | 5 | thread found: remove it, record 1, go right to 3 | \`[4, 2, 5, 1]\` |
| 3 | - | no left child: record 3, go right to 6 | \`[4, 2, 5, 1, 3]\` |
| 6 | - | no left child: record 6, go right (null), loop ends | \`[4, 2, 5, 1, 3, 6]\` |

## Complexity

| Measure | Cost | Why |
|---------|------|-----|
| Time | O(n) | Each edge is walked at most about twice: once to find a predecessor, once to travel; so the total is linear even though the predecessor search looks nested |
| Space | O(1) | Only \`curr\` and \`pred\`; the threads reuse existing null pointers (the output array is separate) |

## When to use it

- When memory is tight or the recursion depth is unbounded and you still need inorder (or, with a small change, preorder).
- Caveat: the tree is modified while the traversal runs, so it is not safe with concurrent readers, and an exception in the middle would leave threads behind.
- vs. the **iterative stack** version: same O(n) time, but Morris needs no stack at the cost of mutating the tree and a slightly larger constant.

## Common pitfalls

- Forgetting the \`pred.right !== curr\` condition in the predecessor search: the loop then follows a thread back up and never terminates.
- Not removing the thread on the second visit: the tree stays corrupted (and may contain a cycle).
- Recording the node at the first visit (that is preorder) instead of the second.
- Nodes with no left child are never threaded; they are recorded exactly once, in step 2, so do not record them again in the thread branch.

## What to watch in the visualizer

- The \`pred\` and \`curr\` chips on the tree: \`pred\` runs down the right edge of \`curr\`'s left subtree, then \`curr\` moves.
- \`pred.right\` in the variables panel: it becomes \`curr\` when the thread is created and returns to \`null\` when it is removed. The tree view does **not** draw the thread as an edge (the tree is shown by its \`left\`/\`right\` children), so read it from the variables panel.
- \`curr\` jumping up the tree along a thread right after a leaf is recorded.
- \`result\` getting a value when \`curr\` has no left child and when a thread is removed.
- There is no stack variable at all.

## Example

\`\`\`
Input:  root = [1, 2, 3, 4, 5, null, 6]
Output: [4, 2, 5, 1, 3, 6]
\`\`\`
`;

export function buildMorrisTraversal(): QuestionInput {
  return {
    slug: "morris-traversal",
    title: "Morris Inorder Traversal",
    difficulty: "Hard",
    tags: ["tree", "traversal", "morris", "threaded-tree", "constant-space"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        method: "morrisInorder",
        args: [[1, 2, 3, 4, 5, null, 6]],
        expected: [4, 2, 5, 1, 3, 6],
      },
      {
        method: "morrisInorder",
        args: [[1, null, 2, 3]],
        expected: [1, 3, 2],
      },
      {
        method: "morrisInorder",
        args: [[4, 2, 6, 1, 3, 5, 7]],
        expected: [1, 2, 3, 4, 5, 6, 7],
      },
      {
        method: "morrisInorder",
        args: [[]],
        expected: [],
      },
    ],
    visualHints: { root: "tree" },
  };
}
