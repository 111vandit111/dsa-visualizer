import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class BTree {
  constructor(t) {
    this.t = t; // minimum degree: non-root nodes hold t-1 .. 2t-1 keys
    this.root = new BTreeNode();
  }

  search(key) {
    let node = this.root;
    while (node !== null) {
      let i = 0;
      while (i < node.keys.length && key > node.keys[i]) i++;
      if (i < node.keys.length && key === node.keys[i]) return true;
      node = node.children.length === 0 ? null : node.children[i];
    }
    return false;
  }

  insert(key) {
    if (this.root.keys.length === 2 * this.t - 1) {
      // Full root: split it first, the tree grows one level taller
      const newRoot = new BTreeNode();
      newRoot.children.push(this.root);
      this.splitChild(newRoot, 0);
      this.root = newRoot;
    }
    this.insertNonFull(this.root, key);
  }

  // parent.children[i] is full (2t-1 keys): push its middle key up into parent
  splitChild(parent, i) {
    const t = this.t;
    const full = parent.children[i];
    const right = new BTreeNode();
    const middle = full.keys[t - 1];
    right.keys = full.keys.slice(t); // upper t-1 keys
    right.children = full.children.slice(t);
    full.keys = full.keys.slice(0, t - 1); // lower t-1 keys stay
    full.children = full.children.slice(0, t);
    parent.keys.splice(i, 0, middle);
    parent.children.splice(i + 1, 0, right);
  }

  insertNonFull(node, key) {
    let i = node.keys.length - 1;
    while (i >= 0 && key < node.keys[i]) i--;
    if (node.children.length === 0) {
      node.keys.splice(i + 1, 0, key); // leaf: drop the key into its sorted slot
      return;
    }
    i++; // child that covers key
    if (node.children[i].keys.length === 2 * this.t - 1) {
      // Proactive split on the way down, so the parent always has room
      this.splitChild(node, i);
      if (key > node.keys[i]) i++;
    }
    this.insertNonFull(node.children[i], key);
  }

  // Keys level by level: one array of key lists per depth
  toLevels() {
    const levels = [];
    let level = [this.root];
    while (level.length > 0 && level[0].keys.length > 0) {
      levels.push(level.map((node) => node.keys.slice()));
      level = level.flatMap((node) => node.children);
    }
    return levels;
  }
}

// Declared after BTree: the runner constructs the first top-level class
class BTreeNode {
  constructor() {
    this.keys = []; // sorted
    this.children = []; // empty for a leaf, else keys.length + 1 subtrees
  }
}
`;

const DESCRIPTION = `A **B-tree** is a balanced search tree whose nodes hold many sorted keys and have many children. All leaves sit at the same depth, and every node except the root stays at least half full, so a tree of millions of keys is only 3 or 4 levels deep. Databases (InnoDB, PostgreSQL indexes) and file systems (NTFS, ext4, APFS) use B-trees and their B+ variant to find data with very few disk reads. This sample builds a B-tree of **minimum degree t = 2** (a 2-3-4 tree) with \`insert\`, \`search\` and \`toLevels\`.

## Intuition

Picture a library index: each card (node) lists a few sorted keys, and between two keys it points to the shelf that holds everything in that range. One look at a card narrows the search to one shelf out of many.

The **minimum degree t** fixes the node size:

- every node except the root holds between \`t − 1\` and \`2t − 1\` keys,
- an internal node with \`k\` keys has exactly \`k + 1\` children,
- the **order** (maximum children) is \`m = 2t\`; with t = 2, nodes hold 1 to 3 keys and 2 to 4 children.

The tree grows **at the root**, never at the leaves: a full node is split in two and its middle key moves up. That is why every leaf stays at the same depth. Splitting full nodes *on the way down* (proactive splitting) guarantees that the parent always has room for the promoted key, so insert is a single top-down pass with no backtracking.

**Why disks love B-trees:** a disk or SSD reads a whole page (4 to 16 KB) at a time. Sizing a node to one page lets one read bring in hundreds of keys, so the height is \`log_t(n)\` instead of \`log_2(n)\`. With t = 500, a billion keys fit in 4 levels, and the top levels stay cached in memory.

**B+ tree difference:** in a B+ tree, internal nodes hold only routing keys; every record lives in the leaves, and the leaves are linked left to right. Internal nodes therefore fit more keys (shallower tree), and range scans walk the leaf chain without going back up. Most database indexes are B+ trees.

## How it works

**search(key)**

1. In the current node, move \`i\` right while \`key > keys[i]\`.
2. If \`keys[i] === key\`, return \`true\`.
3. If the node is a leaf, return \`false\`; otherwise descend into \`children[i]\` and repeat.

**insert(key)**

1. If the root is full (\`2t − 1\` keys), make a new empty root, hang the old root under it and split it. The height grows by one.
2. \`insertNonFull(node, key)\`: find the last key smaller than \`key\`.
   - **Leaf:** splice \`key\` into its sorted slot. Done.
   - **Internal:** pick child \`i\`. If that child is full, split it first; the promoted middle key now sits at \`keys[i]\`, so move to \`i + 1\` when \`key\` is larger. Recurse into the child.

**splitChild(parent, i)** takes a full child with \`2t − 1\` keys, keeps the lower \`t − 1\` keys (and \`t\` children) in place, moves the upper \`t − 1\` keys (and \`t\` children) into a new right sibling, and inserts the middle key into \`parent\` between them.

## Walkthrough

Case 0 uses \`t = 2\` (max 3 keys per node) and inserts \`10, 80, 20, 60, 90, 50, 40, 70, 30\`. Levels are shown top to bottom.

\`\`\`
insert 10   [10]
insert 80   [10 80]
insert 20   [10 20 80]                            root is now full
insert 60   root full -> split it, 20 moves up into a new root
            [20] / [10] [80]
            then 60 > 20 goes to the right leaf
            [20] / [10] [60 80]
insert 90   [20] / [10] [60 80 90]
insert 50   child [60 80 90] full -> split, 80 moves up; 50 < 80 goes left
            [20 80] / [10] [50 60] [90]
insert 40   [20 80] / [10] [40 50 60] [90]
insert 70   child [40 50 60] full -> split, 50 moves up; 70 > 50 goes right
            [20 50 80] / [10] [40] [60 70] [90]
insert 30   root [20 50 80] full -> split, 50 becomes the new root
            [50] / [20] [80] / [10] [30 40] [60 70] [90]
search 40   [50]: 40 < 50 -> child 0 [20]: 40 > 20 -> child 1 [30 40]: found   true
search 35   [50] -> [20] -> [30 40]: 35 is between 30 and 40, leaf          false
\`\`\`

Two kinds of split appear: the **root** splits at 60 and at 30 (the tree grows one level taller), and a full **leaf** splits on the way down at 50 and at 70 (its parent gains the middle key) before the new key is placed.

## Complexity

| Operation | Time | Why |
|-----------|------|-----|
| search | O(t · log_t n) | height ≤ log_t((n + 1) / 2); a linear scan of ≤ 2t − 1 keys per node (binary search makes it O(log n)) |
| insert | O(t · log_t n) | one top-down pass; each split moves O(t) keys |
| disk reads per search / insert | O(log_t n) | one page per level, the real cost on disk |
| toLevels | O(n) | every key is copied once |
| space | O(n) | each node is at least half full (except the root) |

## When to use it

- **Strengths:** very shallow, cache- and disk-friendly, always balanced, supports ordered iteration and range queries.
- **vs. red-black / AVL trees:** in RAM with small keys, binary trees are simpler; a red-black tree *is* a 2-3-4 B-tree with each node spread over red and black nodes. On disk, B-trees win by a wide margin because each node read pays for many keys.
- **vs. B+ tree:** prefer B+ for range scans and database indexes (all data in linked leaves); plain B-trees can return a hit from an internal node one level earlier.
- **vs. hash index:** hashing gives O(1) point lookups but no ordering, prefix or range queries.
- **Weaknesses:** more code than a binary tree (delete needs borrow and merge cases), and nodes waste space when they are only half full.

## Common pitfalls

- Mixing up **order** (max children, \`m\`) and **minimum degree** (\`t\`, with \`m = 2t\`): the split index \`t − 1\` only works with the right one.
- Forgetting to move the **children** along with the keys when splitting an internal node.
- After a proactive split, not comparing \`key\` with the promoted \`keys[i]\` to choose between the two halves.
- Checking fullness *after* descending: then a split may have to propagate back up, which this top-down design avoids.
- Duplicates: this version allows them (they go to the right); a set-like index should \`search\` first.

## What to watch in the visualizer

- \`this.root\` is drawn as an n-ary tree; each \`BTreeNode\` is labelled with its \`keys\` (e.g. \`20,80\`) and has one child per gap between keys.
- In \`insertNonFull\`, follow \`i\` as it scans \`node.keys\` from the right, then watch \`splitChild\` create \`right\` and splice \`middle\` into \`parent.keys\`.
- The last insert (30) splits the root: the tree gets a new top level in one step.
- In \`search\`, \`i\` sweeps each node's keys and \`node\` hops one level per round.

## Example

\`\`\`
Input:
  ["BTree", "insert", "insert", "insert", "insert", "insert", "insert", "insert", "insert", "insert", "search", "search", "toLevels"]
  [[2], [10], [80], [20], [60], [90], [50], [40], [70], [30], [40], [35], []]
Output:
  [null, null, null, null, null, null, null, null, null, null, true, false,
   [[[50]], [[20], [80]], [[10], [30, 40], [60, 70], [90]]]]
\`\`\`

## Constraints

- \`t ≥ 2\`; keys are numbers.
- At most \`10^4\` operations.
`;

export function buildBTree(): QuestionInput {
  return {
    slug: "b-tree",
    title: "B-Tree",
    difficulty: "Hard",
    tags: ["tree", "b-tree", "self-balancing", "design"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        ops: ["BTree", "insert", "insert", "insert", "insert", "insert", "insert", "insert", "insert", "insert", "search", "search", "toLevels"],
        args: [[2], [10], [80], [20], [60], [90], [50], [40], [70], [30], [40], [35], []],
        expected: [null, null, null, null, null, null, null, null, null, null, true, false, [[[50]], [[20], [80]], [[10], [30, 40], [60, 70], [90]]]],
      },
      {
        // ascending keys: every insert lands in the rightmost leaf
        ops: ["BTree", "insert", "insert", "insert", "insert", "insert", "insert", "insert", "insert", "insert", "search", "toLevels"],
        args: [[2], [1], [2], [3], [4], [5], [6], [7], [8], [9], [9], []],
        expected: [null, null, null, null, null, null, null, null, null, null, true, [[[4]], [[2], [6]], [[1], [3], [5], [7, 8, 9]]]],
      },
      {
        // minimum degree 3: nodes hold 2..5 keys
        ops: ["BTree", "insert", "insert", "insert", "insert", "insert", "insert", "insert", "insert", "search", "search", "toLevels"],
        args: [[3], [5], [1], [9], [3], [7], [2], [8], [4], [4], [6], []],
        expected: [null, null, null, null, null, null, null, null, null, true, false, [[[5]], [[1, 2, 3, 4], [7, 8, 9]]]],
      },
      {
        ops: ["BTree", "search", "toLevels", "insert", "search", "toLevels"],
        args: [[2], [1], [], [1], [1], []],
        expected: [null, false, [], null, true, [[[1]]]],
      },
    ],
    visualHints: {
      "this.root": "tree",
    },
  };
}
