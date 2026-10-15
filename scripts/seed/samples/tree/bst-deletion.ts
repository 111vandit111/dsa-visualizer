import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `// Builds a BST from \`values\`, deletes every key in \`keys\` in order,
// and returns the remaining tree level by level.
function bstDeletion(values, keys) {
  let root = buildBst(values);
  for (const key of keys) {
    root = deleteKey(root, key);
  }
  return levelOrder(root);
}

function deleteKey(root, key) {
  // 1. Find the node to delete and remember its parent.
  let parent = null;
  let curr = root;
  while (curr !== null && curr.val !== key) {
    parent = curr;
    curr = key < curr.val ? curr.left : curr.right;
  }
  if (curr === null) return root; // key not in the tree

  // 2. Two children: copy the in-order successor's value into curr,
  //    then delete the successor node instead (it has no left child).
  if (curr.left !== null && curr.right !== null) {
    let succParent = curr;
    let succ = curr.right;
    while (succ.left !== null) {
      succParent = succ;
      succ = succ.left;
    }
    curr.val = succ.val;
    parent = succParent;
    curr = succ;
  }

  // 3. Now curr has at most one child: splice it out.
  const child = curr.left !== null ? curr.left : curr.right;
  if (parent === null) return child; // deleting the root
  if (parent.left === curr) {
    parent.left = child;
  } else {
    parent.right = child;
  }
  return root;
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

function levelOrder(root) {
  const levels = [];
  if (root === null) return levels;
  const queue = [root];
  while (queue.length > 0) {
    const size = queue.length;
    const level = [];
    for (let i = 0; i < size; i++) {
      const node = queue.shift();
      level.push(node.val);
      if (node.left !== null) queue.push(node.left);
      if (node.right !== null) queue.push(node.right);
    }
    levels.push(level);
  }
  return levels;
}
`;

const DESCRIPTION = `**Deleting a node from a binary search tree** must remove the value while keeping the left-smaller / right-larger ordering intact. There are three cases depending on how many children the node has: none (a leaf), one, or two. This sample builds a BST, deletes a list of keys one by one with an iterative \`deleteKey\`, and returns the remaining tree level by level.

## Intuition

- **Leaf:** nobody depends on it; just cut it off.
- **One child:** the child's whole subtree already fits in the gap, so hand it to the deleted node's parent ("promote the child").
- **Two children:** the node's slot cannot be filled by either child alone. Instead find the value that can legally sit in this position: the **in-order successor** (smallest value in the right subtree). It is larger than everything on the left and not larger than anything on the right. Copy its value into the node, then delete the successor node, which has no left child, so that deletion is a one- or zero-child case.

(The in-order predecessor, the largest value of the left subtree, works symmetrically.)

## How it works

1. Search for \`key\`, tracking \`parent\` and \`curr\`. If \`curr\` becomes \`null\`, the key is absent: return the tree unchanged.
2. If \`curr\` has **two children**: set \`succ\` to the leftmost node of \`curr.right\` (remember \`succParent\`), copy \`succ.val\` into \`curr.val\`, then continue as if we had to delete \`succ\` (set \`curr = succ\`, \`parent = succParent\`).
3. Now \`curr\` has at most one child. Let \`child\` be that child or \`null\`.
4. If \`parent\` is \`null\`, we are deleting the root: the answer is \`child\`.
5. Otherwise replace \`curr\` by \`child\` in its parent: \`parent.left = child\` or \`parent.right = child\`.

## Walkthrough

Test case 0 builds \`[50, 30, 70, 20, 40, 60, 80]\` and deletes \`20\`, \`30\`, \`50\`:

\`\`\`
Start:        50
            /    \\
          30      70
         /  \\    /  \\
       20   40  60   80
\`\`\`

| Delete | Case | What happens | Tree afterwards |
|--------|------|--------------|-----------------|
| 20 | leaf | \`30.left = null\` | \`50(30(,40), 70(60,80))\` |
| 30 | one child | only child 40 exists: \`50.left = 40\` | \`50(40, 70(60,80))\` |
| 50 | two children | successor = leftmost of right subtree = 60; copy 60 into the root, then unlink the old 60 node (\`70.left = null\`) | \`60(40, 70(,80))\` |

Final tree, returned level by level: \`[[60], [40, 70], [80]]\`.

## Complexity

| Measure | Cost | Why |
|---------|------|-----|
| Time, average | O(log n) | One walk down to the node plus at most one walk down to its successor |
| Time, worst | O(n) | A chain-shaped tree has height n |
| Space | O(1) | Only a few pointers (the \`levelOrder\` output is extra) |

## When to use it

- Any ordered set or map that supports removal (the foundation under many library containers).
- Deleting by copying the successor's value keeps the structure small and local; moving the node itself is an alternative that preserves node identity.
- Without balancing, repeated deletions can leave the tree lopsided; AVL / red-black trees rebalance after deleting.

## Common pitfalls

- Forgetting to update the parent's pointer (the node is gone from your variable but still reachable from the tree).
- Handling the root as a special case: when \`parent\` is \`null\`, return \`child\` as the new root.
- Choosing the wrong successor: it is the *leftmost* node of the *right* subtree, not simply \`curr.right\`.
- When the successor is \`curr.right\` itself, the successor's parent is \`curr\`, and the successor hangs on the parent's **right**, not left.
- Deleting a key that does not exist must leave the tree untouched.

## What to watch in the visualizer

- \`parent\` and \`curr\` locating the node, then \`succParent\` and \`succ\` walking down the left spine of the right subtree in the two-children case.
- The value in \`curr.val\` being overwritten (the node keeps its place, only the number changes).
- The final unlink: \`parent.left\` or \`parent.right\` switching to \`child\`.

## Example

\`\`\`
Input:  values = [50, 30, 70, 20, 40, 60, 80], keys = [20, 30, 50]
Output: [[60], [40, 70], [80]]
\`\`\`
`;

export function buildBstDeletion(): QuestionInput {
  return {
    slug: "bst-deletion",
    title: "BST Deletion",
    difficulty: "Medium",
    tags: ["tree", "bst", "deletion"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        method: "bstDeletion",
        args: [[50, 30, 70, 20, 40, 60, 80], [20, 30, 50]],
        expected: [[60], [40, 70], [80]],
      },
      {
        method: "bstDeletion",
        args: [[2, 1, 3], [2]],
        expected: [[3], [1]],
      },
      {
        method: "bstDeletion",
        args: [[5, 3, 8], [4]],
        expected: [[5], [3, 8]],
      },
      {
        method: "bstDeletion",
        args: [[2, 1], [2]],
        expected: [[1]],
      },
    ],
    visualHints: { root: "tree" },
  };
}
