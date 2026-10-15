import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class RedBlackTree {
  constructor() {
    this.root = null;
  }

  insert(val) {
    // 1. Plain BST insert: walk down to the empty spot
    let parent = null;
    let cur = this.root;
    while (cur !== null) {
      if (val === cur.val) return; // keys are unique: ignore duplicates
      parent = cur;
      cur = val < cur.val ? cur.left : cur.right;
    }
    const node = new RBNode(val);
    node.parent = parent;
    if (parent === null) this.root = node;
    else if (val < parent.val) parent.left = node;
    else parent.right = node;
    // 2. Repair a possible red-red violation
    this.fixInsert(node);
  }

  fixInsert(node) {
    while (node.parent !== null && node.parent.color === "R") {
      const parent = node.parent;
      const grand = parent.parent; // exists: a red node is never the root
      const isLeftSide = parent === grand.left;
      const uncle = isLeftSide ? grand.right : grand.left;
      if (uncle !== null && uncle.color === "R") {
        // Case 1: red uncle -> recolor and move the problem two levels up
        parent.color = "B";
        uncle.color = "B";
        grand.color = "R";
        node = grand;
        continue;
      }
      // Case 2: node is an inner grandchild -> rotate it to the outside
      if (isLeftSide && node === parent.right) {
        node = parent;
        this.rotateLeft(node);
      } else if (!isLeftSide && node === parent.left) {
        node = parent;
        this.rotateRight(node);
      }
      // Case 3: node is an outer grandchild -> recolor, rotate the grandparent
      node.parent.color = "B";
      grand.color = "R";
      if (isLeftSide) this.rotateRight(grand);
      else this.rotateLeft(grand);
    }
    this.root.color = "B";
  }

  rotateLeft(x) {
    const y = x.right;
    x.right = y.left;
    if (y.left !== null) y.left.parent = x;
    this.replaceChild(x, y);
    y.left = x;
    x.parent = y;
  }

  rotateRight(x) {
    const y = x.left;
    x.left = y.right;
    if (y.right !== null) y.right.parent = x;
    this.replaceChild(x, y);
    y.right = x;
    x.parent = y;
  }

  // Puts y where x hangs from x's parent (or makes it the root)
  replaceChild(x, y) {
    y.parent = x.parent;
    if (x.parent === null) this.root = y;
    else if (x === x.parent.left) x.parent.left = y;
    else x.parent.right = y;
  }

  search(val) {
    let cur = this.root;
    while (cur !== null) {
      if (val === cur.val) return true;
      cur = val < cur.val ? cur.left : cur.right;
    }
    return false;
  }

  // LeetCode-style level order of "val:color" labels (null = missing child)
  levelOrder() {
    const result = [];
    const queue = [this.root];
    for (let head = 0; head < queue.length; head++) {
      const node = queue[head];
      if (node === null) {
        result.push(null);
        continue;
      }
      result.push(node.val + ":" + node.color);
      queue.push(node.left, node.right);
    }
    while (result.length > 0 && result[result.length - 1] === null) result.pop();
    return result;
  }
}

// Declared after RedBlackTree: the runner constructs the first top-level class
class RBNode {
  constructor(val) {
    this.val = val;
    this.color = "R"; // every new node starts red
    this.left = null; // null children count as black NIL leaves
    this.right = null;
    this.parent = null;
  }
}
`;

const DESCRIPTION = `A **red-black tree** is a binary search tree that keeps itself balanced by painting every node red or black and repairing the colors (plus at most two rotations) after each insert. Search, insert and delete all stay **O(log n)** no matter the insertion order, which is why it powers \`std::map\`, Java's \`TreeMap\` and the Linux scheduler. This sample implements \`insert\` (with all three fix-up cases and their mirrors), \`search\`, and \`levelOrder\`, which returns the tree as \`"val:color"\` labels.

## Intuition

A plain BST degrades into a linked list when keys arrive sorted. A red-black tree forbids that with five rules:

1. Every node is red or black.
2. The root is black.
3. Every NIL leaf (\`null\` child) is black.
4. A red node never has a red child (no **red-red** edge).
5. Every path from a node down to its NIL leaves passes the same number of black nodes (its **black-height**).

Think of black nodes as the "real" levels and red nodes as glue that lets a level hold up to three keys (a red-black tree is a 2-3-4 tree in disguise). Rule 5 makes all black levels equally deep; rule 4 says red glue can at most double a path.

**Why height ≤ 2·log2(n + 1):** by induction, a subtree whose root has black-height \`bh\` holds at least \`2^bh − 1\` internal nodes. Rule 4 means at least half the nodes on any root-to-leaf path are black, so \`bh(root) ≥ h / 2\`. Therefore \`n ≥ 2^(h/2) − 1\`, which rearranges to \`h ≤ 2·log2(n + 1)\`.

## How it works

**Insert(val)**

1. Walk down like a BST insert and hang a new **red** node at the empty spot. Red never breaks rule 5; it can only break rule 4 (red parent) or rule 2 (empty tree).
2. While the node's parent is red, look at the **uncle** (the parent's sibling):
   - **Case 1 (uncle is red):** paint parent and uncle black, grandparent red, and continue from the grandparent (the violation moved two levels up).
   - **Case 2 (uncle is black, node is an inner grandchild)** (left-right or right-left zig-zag): rotate the parent so the node becomes an outer grandchild, then fall into case 3.
   - **Case 3 (uncle is black, node is an outer grandchild)** (left-left or right-right line): paint the parent black and the grandparent red, then rotate the grandparent the other way. The loop ends.
3. Every case has a mirror: \`isLeftSide\` tells whether the parent hangs left of the grandparent and flips which rotation is used.
4. Paint the root black.

**Rotations** keep the in-order sequence intact: \`rotateLeft(x)\` lifts \`x.right\` into x's place and hands its left subtree to x; \`rotateRight\` is the mirror.

**Search(val)** is ordinary BST search; colors are ignored.

## Walkthrough

Case 0 inserts \`10, 20, 30, 15, 12, 5, 1\`, then searches and prints the tree. \`B\` = black, \`R\` = red.

\`\`\`
insert 10  root 10R -> repaint root          10B
insert 20  parent 10 is black, nothing to fix 10B(-, 20R)
insert 30  parent 20R, uncle null (black), outer (right-right)
           case 3: 20->B, 10->R, rotateLeft(10)
           20B(10R, 30R)
insert 15  parent 10R, uncle 30R
           case 1: 10->B, 30->B, 20->R, move up to 20
           20 is the root -> repaint black
           20B(10B(-, 15R), 30B)
insert 12  parent 15R, uncle null, inner (right-left zig-zag)
           case 2: rotateRight(15) -> 12 is now the outer child
           case 3: 12->B, 10->R, rotateLeft(10)
           20B(12B(10R, 15R), 30B)
insert 5   parent 10R, uncle 15R
           case 1: 10->B, 15->B, 12->R, move to 12 (parent 20 is black, stop)
           20B(12R(10B(5R, -), 15B), 30B)
insert 1   parent 5R, uncle null, outer (left-left)
           case 3: 5->B, 10->R, rotateRight(10)
           20B(12R(5B(1R, 10R), 15B), 30B)
search 15  20 -> 12 -> 15                    true
search 7   20 -> 12 -> 5 -> 10 -> null       false
\`\`\`

Final tree (every root-to-NIL path passes exactly 2 black nodes):

\`\`\`
          20B
        /     \\
     12R       30B
    /   \\
  5B     15B
 /  \\
1R   10R
\`\`\`

## Complexity

| Operation | Time | Why |
|-----------|------|-----|
| search | O(log n) | height ≤ 2·log2(n + 1) |
| insert (descent) | O(log n) | one root-to-leaf walk |
| insert (fix-up) | O(log n) recolors, ≤ 2 rotations | case 1 climbs two levels per round; cases 2 + 3 end the loop |
| levelOrder | O(n) | each node and NIL child is queued once |
| space | O(n) | one node (value, color, three links) per key; insert itself uses O(1) extra |

## When to use it

- **Strengths:** guaranteed O(log n) worst case, ordered iteration, few rotations per update (good when writes are frequent). This is why most language libraries pick it for ordered maps and sets.
- **vs. AVL tree:** AVL is more strictly balanced (height ≤ 1.44·log2 n) so lookups are a little faster, but inserts and deletes rotate more. Red-black favours write-heavy workloads.
- **vs. B-tree:** on disk or with large caches, B-trees win because one node holds many keys. A red-black tree is exactly a B-tree of order 4 with each node split into a black key plus red neighbours.
- **vs. hash map:** a hash map gives O(1) average lookups but no ordering, range queries or worst-case guarantee.
- **Weaknesses:** delete is notoriously fiddly (four more cases), and the code is longer than a skip list or treap with similar bounds.

## Common pitfalls

- Forgetting that a \`null\` child is **black**: the uncle check must treat \`null\` as black (\`uncle !== null && uncle.color === "R"\`).
- Not updating \`parent\` links during rotations, or forgetting the case where the rotated node was the root (\`replaceChild\` handles all three spots).
- In case 2, rotating but continuing with the old \`node\`: after the rotation the former parent is the new outer grandchild.
- Only writing the left-side cases: half of all inserts need the mirrored rotations.
- Forgetting the final \`root.color = "B"\` after case 1 recolors the root red.

## What to watch in the visualizer

- Step through \`fixInsert\` and follow the \`node\`, \`parent\`, \`uncle\` and \`grand\` chips on the tree: the uncle's color decides the case.
- \`this.root\` is drawn as a tree whose labels read value:color (\`20:B\`, \`12:R\`), with red nodes filled red and black nodes dark. Rotations visibly re-hang subtrees while the in-order order of values never changes.
- The final \`levelOrder\` call fills \`result\` with the same labels, drawn as a level-order tree, so you can check rules 4 and 5 at a glance.
- \`cur\` slides down the tree during the BST descent and during \`search\`.

## Example

\`\`\`
Input:
  ["RedBlackTree", "insert", "insert", "insert", "insert", "insert", "insert", "insert", "search", "search", "levelOrder"]
  [[], [10], [20], [30], [15], [12], [5], [1], [15], [7], []]
Output:
  [null, null, null, null, null, null, null, null, true, false,
   ["20:B", "12:R", "30:B", "5:B", "15:B", null, null, "1:R", "10:R"]]
\`\`\`

## Constraints

- Keys are unique numbers; inserting an existing key does nothing.
- At most \`10^4\` operations.
`;

export function buildRedBlackTree(): QuestionInput {
  return {
    slug: "red-black-tree",
    title: "Red-Black Tree",
    difficulty: "Hard",
    tags: ["tree", "bst", "self-balancing", "rotation", "design"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        ops: ["RedBlackTree", "insert", "insert", "insert", "insert", "insert", "insert", "insert", "search", "search", "levelOrder"],
        args: [[], [10], [20], [30], [15], [12], [5], [1], [15], [7], []],
        expected: [null, null, null, null, null, null, null, null, true, false, ["20:B", "12:R", "30:B", "5:B", "15:B", null, null, "1:R", "10:R"]],
      },
      {
        // ascending keys: repeated right-right rotations plus recolors
        ops: ["RedBlackTree", "insert", "insert", "insert", "insert", "insert", "insert", "insert", "insert", "levelOrder"],
        args: [[], [1], [2], [3], [4], [5], [6], [7], [8], []],
        expected: [null, null, null, null, null, null, null, null, null, ["4:B", "2:R", "6:R", "1:B", "3:B", "5:B", "7:B", null, null, null, null, null, null, null, "8:R"]],
      },
      {
        // descending keys plus a left-right zig-zag and a duplicate
        ops: ["RedBlackTree", "insert", "insert", "insert", "insert", "insert", "insert", "insert", "search", "search", "levelOrder"],
        args: [[], [50], [40], [30], [20], [25], [25], [10], [25], [35], []],
        expected: [null, null, null, null, null, null, null, null, true, false, ["40:B", "25:R", "50:B", "20:B", "30:B", null, null, "10:R"]],
      },
      {
        ops: ["RedBlackTree", "search", "levelOrder", "insert", "levelOrder"],
        args: [[], [1], [], [7], []],
        expected: [null, false, [], null, ["7:B"]],
      },
    ],
    visualHints: {
      "this.root": "tree",
      result: "tree",
    },
  };
}
