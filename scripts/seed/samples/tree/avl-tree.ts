import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class AVLTree {
  constructor() {
    this.root = null;
  }

  insert(value) {
    this.root = this.insertNode(this.root, value);
  }

  // Normal BST insert, then rebalance every node on the way back up.
  insertNode(node, value) {
    if (node === null) return new AVLNode(value);
    if (value < node.val) {
      node.left = this.insertNode(node.left, value);
    } else if (value > node.val) {
      node.right = this.insertNode(node.right, value);
    } else {
      return node; // duplicates are ignored
    }
    return this.rebalance(node);
  }

  rebalance(node) {
    this.updateHeight(node);
    const balance = this.balanceOf(node);

    if (balance > 1) {
      // Left-heavy. If the left child leans right, that is the LR case.
      if (this.balanceOf(node.left) < 0) {
        node.left = this.rotateLeft(node.left);
      }
      return this.rotateRight(node);
    }
    if (balance < -1) {
      // Right-heavy. If the right child leans left, that is the RL case.
      if (this.balanceOf(node.right) > 0) {
        node.right = this.rotateRight(node.right);
      }
      return this.rotateLeft(node);
    }
    return node;
  }

  // Lifts y.left above y. Returns the new subtree root.
  rotateRight(y) {
    const x = y.left;
    y.left = x.right;
    x.right = y;
    this.updateHeight(y);
    this.updateHeight(x);
    return x;
  }

  // Lifts x.right above x. Returns the new subtree root.
  rotateLeft(x) {
    const y = x.right;
    x.right = y.left;
    y.left = x;
    this.updateHeight(x);
    this.updateHeight(y);
    return y;
  }

  heightOf(node) {
    return node === null ? 0 : node.height;
  }

  updateHeight(node) {
    node.height = 1 + Math.max(this.heightOf(node.left), this.heightOf(node.right));
  }

  // Balance factor = height(left) - height(right). AVL keeps it in [-1, 1].
  balanceOf(node) {
    return node === null ? 0 : this.heightOf(node.left) - this.heightOf(node.right);
  }

  height() {
    return this.heightOf(this.root);
  }

  rootBalance() {
    return this.balanceOf(this.root);
  }

  levelOrder() {
    const result = [];
    if (this.root === null) return result;
    const queue = [this.root];
    while (queue.length > 0) {
      const node = queue.shift();
      result.push(node.val);
      if (node.left !== null) queue.push(node.left);
      if (node.right !== null) queue.push(node.right);
    }
    return result;
  }
}

class AVLNode {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
    this.height = 1; // a lone node has height 1
  }
}
`;

const DESCRIPTION = `An **AVL tree** is a self-balancing binary search tree: after every insertion it checks each node on the way back up and, if the two subtrees of a node differ in height by more than 1, it fixes the imbalance with a **rotation**. This guarantees a height of O(log n), so search, insert and delete are always O(log n) even for sorted input. This sample implements \`insert\` with all four rotation cases and reports the level-order, the height and the root's balance factor.

## Intuition

A plain BST built from \`1, 2, 3, 4, 5\` is a chain, as slow as a linked list. The AVL rule keeps the tree "almost level": for **every** node, \`|height(left) - height(right)| <= 1\`. The value \`height(left) - height(right)\` is the node's **balance factor** (BF), allowed to be -1, 0 or 1.

A **rotation** is a local pointer shuffle that lifts a deeper child above its parent while keeping the BST order (left < node < right). It changes heights but never the inorder sequence, which is why it is safe. An insertion can only unbalance nodes on the path from the new leaf to the root, and fixing the lowest unbalanced node restores the whole tree, so one (single or double) rotation per insertion is enough.

## How it works

1. Insert like in a normal BST (recursively), then on the way back up recompute each node's \`height = 1 + max(height(left), height(right))\` and its balance factor \`bf = height(left) - height(right)\`.
2. If \`bf\` is within [-1, 1], nothing to do. Otherwise the node is unbalanced and one of four cases applies:
   - **LL (bf > 1, left child's bf >= 0):** the new node went into the left subtree of the left child. Fix: \`rotateRight(node)\`.
   - **RR (bf < -1, right child's bf <= 0):** mirror image. Fix: \`rotateLeft(node)\`.
   - **LR (bf > 1, left child's bf < 0):** the new node went into the right subtree of the left child. First \`rotateLeft(node.left)\` to turn it into LL, then \`rotateRight(node)\`.
   - **RL (bf < -1, right child's bf > 0):** first \`rotateRight(node.right)\` to turn it into RR, then \`rotateLeft(node)\`.
3. \`rotateRight(y)\`: \`x = y.left\`; \`y.left = x.right\`; \`x.right = y\`; recompute heights of \`y\` then \`x\`; \`x\` is the new subtree root. \`rotateLeft\` is the mirror image.
4. Return the (possibly new) subtree root to the caller, which stores it as its child, so the rotation is hooked into the tree.

## Walkthrough

Test case 0 inserts \`10, 5, 7, 15, 20\`. It shows a double rotation (LR) and a single rotation (RR):

| Insert | What happens | Tree (level order) |
|--------|--------------|--------------------|
| 10 | root | \`[10]\` |
| 5 | left child of 10 (BF of 10 is +1, fine) | \`[10, 5]\` |
| 7 | goes 10 -> 5 -> right of 5. Node 10 has BF +2 and its left child 5 has BF -1 (leans right): **LR**. \`rotateLeft(5)\` lifts 7 above 5, then \`rotateRight(10)\` lifts 7 above 10 | \`[7, 5, 10]\` |
| 15 | right of 10 (BF of 7 is -1, fine) | \`[7, 5, 10, 15]\` |
| 20 | goes 7 -> 10 -> 15 -> right of 15. Node 10 has BF -2 and its right child 15 has BF -1: **RR**, \`rotateLeft(10)\` lifts 15 above 10 | \`[7, 5, 15, 10, 20]\` |

The LR fix in picture form:

\`\`\`
Before (unbalanced at 10)     After rotateLeft(5)      After rotateRight(10)
      10  (BF +2)                   10                        7
     /                             /                        /   \\
    5   (BF -1)                   7                        5     10
     \\                           /
      7                         5
\`\`\`

Final level order: \`[7, 5, 15, 10, 20]\`, height \`3\`, root balance factor \`-1\` (left subtree height 1, right subtree height 2, which is still allowed). Test case 1 (\`10, 20, 30, 40, 50, 25\`) additionally exercises the RL case.

## Complexity

| Operation | Time | Space | Why |
|-----------|------|-------|-----|
| insert | O(log n) | O(log n) | The height is O(log n); a rotation is O(1) and at most one is needed per insert; recursion depth is the height |
| search | O(log n) | O(1) | Same as a BST, but the height is guaranteed |
| levelOrder / height / balance | O(n) / O(1) / O(1) | O(w) / O(1) / O(1) | Height is stored in each node, so no recount is needed |

Total space for the tree: O(n), plus one extra integer (\`height\`) per node.

## When to use it

- Lookup-heavy workloads: AVL trees are more strictly balanced than red-black trees (height at most about 1.44 log n), so searches are slightly faster, while insert/delete do a bit more rotation work.
- vs. a plain **BST**: no worst-case degeneration on sorted input.
- vs. a **red-black tree**: fewer rotations on updates; AVL prefers faster reads.
- vs. a **hash table**: AVL keeps keys ordered (range queries, predecessor, sorted iteration).

## Common pitfalls

- Mixing up LR and RL: decide from the *child's* balance factor, not the new value's position by eye.
- Updating heights in the wrong order after a rotation: the lower node (the one pushed down) must be recomputed **before** the new subtree root.
- Forgetting to assign the rotation result back (\`node.left = rotateLeft(node.left)\` or returning it to the parent), which loses the whole subtree.
- Using \`height = 0\` for leaves in one place and \`1\` in another; null is 0 and a leaf is 1 here.
- Treating a bf of exactly +-1 as a violation; it is allowed.

## What to watch in the visualizer

- The recursion unwinding: after the new leaf is attached, each frame's \`node\` is rebalanced from the bottom up (watch \`balance\` and \`node.height\`).
- The moment \`balance\` becomes 2 or -2: look at the sign of the child's balance to see whether a single or double rotation follows.
- Inside \`rotateLeft\` / \`rotateRight\`: \`x\`, \`y\` swap places and the subtree's root changes; the tree view redraws with the new root.
- \`this.root\` changing: in test case 0 it moves from 10 to 7 on the third insert (the LR rotation).

## Example

\`\`\`
Input:  insert 10, 5, 7, 15, 20, then levelOrder(), height(), rootBalance()
Output: [7, 5, 15, 10, 20], 3, -1
\`\`\`
`;

export function buildAvlTree(): QuestionInput {
  return {
    slug: "avl-tree",
    title: "AVL Tree",
    difficulty: "Hard",
    tags: ["tree", "bst", "avl", "rotation", "self-balancing"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        ops: ["AVLTree", "insert", "insert", "insert", "insert", "insert", "levelOrder", "height", "rootBalance"],
        args: [[], [10], [5], [7], [15], [20], [], [], []],
        expected: [null, null, null, null, null, null, [7, 5, 15, 10, 20], 3, -1],
      },
      {
        ops: ["AVLTree", "insert", "insert", "insert", "insert", "insert", "insert", "levelOrder", "height", "rootBalance"],
        args: [[], [10], [20], [30], [40], [50], [25], [], [], []],
        expected: [null, null, null, null, null, null, null, [30, 20, 40, 10, 25, 50], 3, 0],
      },
      {
        ops: ["AVLTree", "insert", "insert", "insert", "insert", "insert", "levelOrder"],
        args: [[], [5], [3], [4], [2], [1], []],
        expected: [null, null, null, null, null, null, [4, 2, 5, 1, 3]],
      },
      {
        ops: ["AVLTree", "insert", "insert", "insert", "insert", "levelOrder", "height"],
        args: [[], [3], [2], [1], [2], [], []],
        expected: [null, null, null, null, null, [2, 1, 3], 2],
      },
    ],
    visualHints: { "this.root": "tree" },
  };
}
