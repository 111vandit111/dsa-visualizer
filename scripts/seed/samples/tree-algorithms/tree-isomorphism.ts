import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `function flipEquiv(values1, values2) {
  const root1 = buildTree(values1);
  const root2 = buildTree(values2);
  // True if subtree a can be turned into subtree b by swapping children
  function same(a, b) {
    if (a === null || b === null) return a === b; // both empty, or shapes differ
    if (a.val !== b.val) return false;
    // Children match as they are, or after flipping one pair
    const isStraight = same(a.left, b.left) && same(a.right, b.right);
    if (isStraight) return true;
    return same(a.left, b.right) && same(a.right, b.left);
  }
  return same(root1, root2);
}

// Builds TreeNodes from a LeetCode level-order array (null = missing child)
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

const DESCRIPTION = `Two trees are **isomorphic** when one can be turned into the other by relabeling or reordering. This sample solves the common binary-tree version, **flip equivalence**: values must match, but at any node you may swap the left and right children. Return \`true\` if some sequence of flips turns tree 1 into tree 2. It is the core of comparing structures where child order carries no meaning: chemical molecules, expression trees of commutative operators, file-system snapshots.

## Intuition

Two roots match when their values are equal and their **pairs of children** match, in either order. That is a direct recursive definition:

\`\`\`
same(a, b) = a.val == b.val and (
               (same(a.left, b.left)  and same(a.right, b.right))   // keep as is
            or (same(a.left, b.right) and same(a.right, b.left)) )  // flip here
\`\`\`

Empty subtrees match only empty subtrees. Since a flip at one node does not affect the choices below it, each node decides independently, and the recursion simply tries both options.

## How it works

1. Build both trees from their level-order arrays.
2. \`same(a, b)\`:
   1. If either is \`null\`, return \`a === b\` (true only if both are empty).
   2. If the values differ, return \`false\`.
   3. Try the **straight** pairing (left with left, right with right); if it works, return \`true\`.
   4. Otherwise return the result of the **flipped** pairing (left with right, right with left).
3. Return \`same(root1, root2)\`.

## Walkthrough

Case 0 (flips needed at nodes 1, 3 and 5):

\`\`\`
tree 1: [1,2,3,4,5,6,null,null,null,7,8]   tree 2: [1,3,2,null,6,4,5,null,null,null,null,8,7]

        1                                        1
      /   \\                                    /   \\
     2     3                                  3     2
    / \\   /                                    \\   / \\
   4   5 6                                      6 4   5
      / \\                                            / \\
     7   8                                          8   7
\`\`\`

\`\`\`
same(1, 1)    values equal
  straight: same(2, 3)        2 != 3                      false
  flipped:  same(2, 2)
              straight: same(4, 4)   leaves                true
                        same(5, 5)
                          straight: same(7, 8)  7 != 8     false
                          flipped:  same(7, 7), same(8, 8) true
                        -> true
            -> true
            same(3, 3)
              straight: same(6, null)  shapes differ       false
              flipped:  same(6, 6), same(null, null)       true
            -> true
-> true
\`\`\`

## Complexity

| Case | Time | Why |
|------|------|-----|
| best | O(1) | root values differ |
| typical | O(n) | with distinct values, a wrong pairing fails at its first comparison, so each node is matched about once |
| worst | O(n²) | with many repeated values, the straight attempt can explore deep before failing and the flipped one repeats the work |
| space | O(h) | recursion depth = tree height h |

\`n\` = number of nodes. A canonical form (below) brings the worst case down to O(n log n) or O(n).

## When to use it

- **Distinct values (the usual case):** this recursion is the simplest solution and runs in linear time. An equivalent shortcut: at each node, decide the pairing by comparing the left child's value, then recurse once per side.
- **Canonical form:** rewrite each tree so that, at every node, the smaller child (by value or by a canonical string) comes first, then compare the two canonical trees directly. Robust to repeated values.
- **General rooted-tree isomorphism (unlabeled, any number of children):** the AHU algorithm gives every node a canonical name built from the sorted names of its children, then compares the root names. O(n log n) with sorting, O(n) with careful bucketing.
- **Unrooted trees:** root both trees at their centers (one or two nodes found by repeatedly peeling leaves) and run the rooted check.
- **vs. graph isomorphism:** trees are easy (near linear time); no polynomial algorithm is known for general graphs.

## Common pitfalls

- Forgetting the \`null\` cases: \`same(null, node)\` must be \`false\`, \`same(null, null)\` must be \`true\`.
- Comparing only values level by level (or sorted value lists): different shapes can share the same values.
- Allowing a "flip" of only one child: a flip swaps the whole pair, so both pairings must be checked together.
- Forgetting that the flipped attempt is needed even when values match: \`same(2, 3)\` can fail on the straight pairing while the flipped one succeeds.
- With duplicate values the plain recursion can become quadratic; use a canonical form for large inputs.

## What to watch in the visualizer

- \`root1\` and \`root2\` are drawn as trees; \`a\` and \`b\` mark the pair being compared.
- The call stack shows how deep the comparison is and whether it is in a straight or a flipped attempt; \`isStraight\` records the result of the first try.
- \`values1\` and \`values2\` show the level-order inputs.

## Example

\`\`\`
Input: values1 = [1, 2, 3, 4, 5, 6, null, null, null, 7, 8]
       values2 = [1, 3, 2, null, 6, 4, 5, null, null, null, null, 8, 7]
Output: true
\`\`\`

## Constraints

- The number of nodes in each tree is in the range \`[0, 100]\`.
- Each tree has unique values in the range \`[0, 99]\`.
`;

export function buildTreeIsomorphism(): QuestionInput {
  return {
    slug: "tree-isomorphism",
    title: "Tree Isomorphism (Flip Equivalence)",
    difficulty: "Medium",
    tags: ["tree", "dfs", "recursion", "isomorphism"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        method: "flipEquiv",
        args: [
          [1, 2, 3, 4, 5, 6, null, null, null, 7, 8],
          [1, 3, 2, null, 6, 4, 5, null, null, null, null, 8, 7],
        ],
        expected: true,
      },
      // flips at nodes 1 and 2
      { method: "flipEquiv", args: [[1, 2, 3, 4], [1, 3, 2, null, null, null, 4]], expected: true },
      { method: "flipEquiv", args: [[1, 2, 3, 4], [1, 2, 3, null, null, 4]], expected: false },
      { method: "flipEquiv", args: [[], [1]], expected: false },
    ],
    visualHints: {
      values1: "tree",
      values2: "tree",
    },
  };
}
