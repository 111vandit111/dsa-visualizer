import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `function bstInsertion(values) {
  let root = null;
  for (let i = 0; i < values.length; i++) {
    root = insert(root, values[i]);
  }
  return [inorder(root), levelOrder(root)];
}

// Insert \`value\` into the BST rooted at \`root\` and return the (possibly new) root.
function insert(root, value) {
  const node = new TreeNode(value);
  if (root === null) return node;

  let parent = null;
  let curr = root;
  // Walk down: smaller values go left, larger go right.
  while (curr !== null) {
    parent = curr;
    if (value < curr.val) {
      curr = curr.left;
    } else if (value > curr.val) {
      curr = curr.right;
    } else {
      return root; // duplicate: keep the tree unchanged
    }
  }
  // curr fell off the tree: parent is where the new leaf attaches.
  if (value < parent.val) {
    parent.left = node;
  } else {
    parent.right = node;
  }
  return root;
}

// Left, node, right: a BST yields its values in sorted order.
function inorder(root) {
  const result = [];
  function visit(node) {
    if (node === null) return;
    visit(node.left);
    result.push(node.val);
    visit(node.right);
  }
  visit(root);
  return result;
}

// Breadth-first: shows the actual shape of the tree, level by level.
function levelOrder(root) {
  const result = [];
  if (root === null) return result;
  const queue = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    result.push(node.val);
    if (node.left !== null) queue.push(node.left);
    if (node.right !== null) queue.push(node.right);
  }
  return result;
}
`;

const DESCRIPTION = `A **binary search tree (BST)** keeps its values ordered: for every node, everything in the left subtree is smaller and everything in the right subtree is larger. **Insertion** finds the one empty spot where a new value belongs and attaches it as a new leaf. This sample inserts a sequence of values one after another, then returns the tree's inorder traversal (always sorted) and its level-order traversal (which shows the shape).

## Intuition

Searching for a value in a BST is like the "higher or lower" guessing game: at each node you learn which half of the remaining values can contain it. To insert, you play the same game for the new value until you step off the tree; the empty spot you land on is precisely where a later search for that value would look, so attaching the new node there keeps every search correct.

Invariant: after every insertion, the left-smaller / right-larger rule still holds for every node. New values always become **leaves**; existing nodes never move. As a result the shape of the tree depends on the insertion order.

## How it works

1. If the tree is empty, the new node becomes the \`root\`.
2. Otherwise start with \`curr = root\` and keep \`parent\` one step behind.
3. While \`curr\` is not \`null\`: set \`parent = curr\`; go left if \`value < curr.val\`, go right if \`value > curr.val\`, and stop (ignore the duplicate) if they are equal.
4. When \`curr\` falls off the tree, attach the new node as \`parent.left\` (if \`value < parent.val\`) or \`parent.right\`.
5. After all insertions, \`inorder(root)\` (left, node, right) lists the values in sorted order and \`levelOrder(root)\` (a queue) lists them level by level.

## Walkthrough

Test case 0 inserts \`[5, 3, 8, 1, 4, 7]\`:

| Insert | Path taken | Attached as |
|--------|------------|-------------|
| 5 | tree is empty | the root |
| 3 | 3 < 5, go left, empty | left child of 5 |
| 8 | 8 > 5, go right, empty | right child of 5 |
| 1 | 1 < 5, 1 < 3, empty | left child of 3 |
| 4 | 4 < 5, 4 > 3, empty | right child of 3 |
| 7 | 7 > 5, 7 < 8, empty | left child of 8 |

\`\`\`
      5
     / \\
    3   8
   / \\  /
  1  4 7
\`\`\`

Inorder: \`[1, 3, 4, 5, 7, 8]\` (sorted). Level order: \`[5, 3, 8, 1, 4, 7]\`. The function returns both: \`[[1, 3, 4, 5, 7, 8], [5, 3, 8, 1, 4, 7]]\`.

## Complexity

| Measure | Cost | Why |
|---------|------|-----|
| Insert, average | O(log n) | A reasonably balanced tree halves the candidates at each step |
| Insert, worst | O(n) | Sorted input makes a chain (see test case 1: \`[1, 2, 3, 4]\`) |
| Space | O(1) per insert | The walk is iterative; the tree itself needs O(n) nodes |
| Traversals | O(n) time, O(h) / O(w) extra space | Inorder recursion depth is the height, the level-order queue holds one level |

## When to use it

- Ordered data with frequent inserts, lookups and range queries: sorted iteration comes for free.
- Weakness: no balancing, so already-sorted input degrades it to a linked list. Use an **AVL** or red-black tree when you need guaranteed O(log n).
- vs. a sorted array: inserting is cheaper (no shifting), but lookups have worse constants and no random access.

## Common pitfalls

- Forgetting to track \`parent\`: once \`curr\` is \`null\` you cannot reach the node to attach to.
- Not deciding what to do with duplicates (here they are ignored; some designs send them right or keep a count).
- Not returning the root when the tree starts empty.
- Assuming the tree is balanced: the same values in a different order give a different shape and different cost.

## What to watch in the visualizer

- \`curr\` descending while \`parent\` trails one node behind.
- The new leaf appearing under \`parent\` once \`curr\` becomes \`null\`.
- The final two arrays: inorder is always sorted; level order mirrors the picture of the tree.

## Example

\`\`\`
Input:  values = [5, 3, 8, 1, 4, 7]
Output: [[1, 3, 4, 5, 7, 8], [5, 3, 8, 1, 4, 7]]
\`\`\`
`;

export function buildBstInsertion(): QuestionInput {
  return {
    slug: "bst-insertion",
    title: "BST Insertion",
    difficulty: "Easy",
    tags: ["tree", "bst", "insertion"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        method: "bstInsertion",
        args: [[5, 3, 8, 1, 4, 7]],
        expected: [[1, 3, 4, 5, 7, 8], [5, 3, 8, 1, 4, 7]],
      },
      {
        method: "bstInsertion",
        args: [[1, 2, 3, 4]],
        expected: [[1, 2, 3, 4], [1, 2, 3, 4]],
      },
      {
        method: "bstInsertion",
        args: [[4, 2, 6, 1, 3, 5, 7, 3]],
        expected: [[1, 2, 3, 4, 5, 6, 7], [4, 2, 6, 1, 3, 5, 7]],
      },
      {
        method: "bstInsertion",
        args: [[]],
        expected: [[], []],
      },
    ],
    visualHints: { root: "tree" },
  };
}
