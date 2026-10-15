import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Codec {
  // Preorder with "null" markers, e.g. "1,2,null,null,3,null,null"
  serialize(root) {
    const parts = [];
    function write(node) {
      if (node === null) {
        parts.push("null"); // marks a missing child so the shape is kept
        return;
      }
      parts.push(String(node.val));
      write(node.left);
      write(node.right);
    }
    write(root);
    return parts.join(",");
  }

  // Reads the tokens back in the same preorder
  deserialize(data) {
    const tokens = data.split(",");
    let pos = 0; // next token to read
    function read() {
      const token = tokens[pos];
      pos++;
      if (token === "null") return null;
      const node = new TreeNode(Number(token));
      node.left = read();
      node.right = read();
      return node;
    }
    return read();
  }
}

// Builds a tree, serializes it, rebuilds it, and returns [string, rebuilt tree in level order]
function roundTrip(values) {
  const root = buildTree(values);
  const codec = new Codec();
  const data = codec.serialize(root);
  const copy = codec.deserialize(data);
  return [data, toLevelOrder(copy)];
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

// LeetCode level-order array of a tree, trailing nulls removed
function toLevelOrder(root) {
  const result = [];
  const queue = [root];
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head];
    if (node === null) {
      result.push(null);
      continue;
    }
    result.push(node.val);
    queue.push(node.left, node.right);
  }
  while (result.length > 0 && result[result.length - 1] === null) result.pop();
  return result;
}
`;

const DESCRIPTION = `**Serialization** turns an in-memory tree into a flat string you can store or send; **deserialization** rebuilds an identical tree from that string. This sample's \`Codec\` writes a **preorder** traversal with explicit \`null\` markers for missing children, and reads it back with the same recursion. The \`roundTrip\` method builds a tree from a level-order array, serializes it, deserializes the string, and returns both the string and the rebuilt tree in level order, so you can check that nothing was lost.

## Intuition

A preorder list of values alone is ambiguous: \`1,2,3\` could be a chain or a root with two children. The fix is to also write down **where the tree stops**: every missing child becomes a \`null\` token. With those markers, the token stream describes exactly one tree.

Reading works because preorder is "node, then everything on its left, then everything on its right". The reader consumes one token for the node, then lets a recursive call consume exactly the tokens of the left subtree (it stops by itself at the matching \`null\` markers), and then another call consumes the right subtree. A single shared cursor \`pos\` is all the state needed.

## How it works

**serialize(root)**

1. \`write(node)\`: if \`node\` is \`null\`, append \`"null"\` and return.
2. Otherwise append the value, then \`write(node.left)\`, then \`write(node.right)\`.
3. Join all parts with commas.

**deserialize(data)**

1. Split the string into \`tokens\`; set \`pos = 0\`.
2. \`read()\`: take \`tokens[pos]\` and advance \`pos\`.
   - \`"null"\` → return \`null\`.
   - Otherwise create a node, then \`node.left = read()\` and \`node.right = read()\`.
3. The first \`read()\` returns the root.

**roundTrip(values)** = \`buildTree\` → \`serialize\` → \`deserialize\` → \`toLevelOrder\` (BFS with \`null\` for gaps, trailing nulls trimmed).

## Walkthrough

Case 0: \`values = [1, 2, 3, null, null, 4, 5]\`.

\`\`\`
      1
     / \\
    2   3
       / \\
      4   5
\`\`\`

**serialize** (preorder, one token per call):

\`\`\`
write(1) -> "1"
  write(2) -> "2"
    write(null) -> "null"   write(null) -> "null"
  write(3) -> "3"
    write(4) -> "4", "null", "null"
    write(5) -> "5", "null", "null"
data = "1,2,null,null,3,4,null,null,5,null,null"   (11 tokens = 5 nodes + 6 nulls)
\`\`\`

**deserialize** (\`pos\` = index of the token being read):

\`\`\`
pos 0  "1"    new node 1, read its left
pos 1  "2"    new node 2, read its left
pos 2  "null" 2.left = null
pos 3  "null" 2.right = null       -> 2 is done, back to 1
pos 4  "3"    1.right = new node 3
pos 5  "4"    3.left = 4;  pos 6, 7 are its null children
pos 8  "5"    3.right = 5; pos 9, 10 are its null children
\`\`\`

\`toLevelOrder(copy)\` gives \`[1, 2, 3, null, null, 4, 5]\`, identical to the input.

## Complexity

| Operation | Time | Space | Why |
|-----------|------|-------|-----|
| serialize | O(n) | O(n) | every node and every null child is written once (2n + 1 tokens) |
| deserialize | O(n) | O(n) | every token is read once; recursion depth O(h) |
| roundTrip | O(n) | O(n) | build + serialize + deserialize + BFS, each linear |

## When to use it

- **Preorder + null markers** (this sample): simplest to write and read, streams well, works for any binary tree with any values.
- **Level order (LeetCode format):** the same idea with BFS; easier for humans to read, trailing nulls can be trimmed.
- **Two traversals instead of markers:** preorder + inorder also determines a tree, but only when values are unique, and it needs twice the data.
- **BSTs:** preorder alone suffices (no null markers), because the BST ordering tells where the left subtree ends.
- **Production formats:** JSON, Protocol Buffers or a length-prefixed binary encoding are more robust for real systems; the recursive idea stays the same.

## Common pitfalls

- Omitting \`null\` markers: the shape becomes ambiguous and the rebuilt tree differs.
- Using a delimiter that can appear in values (e.g. commas inside strings), or forgetting negative numbers and multi-digit values when parsing character by character.
- Keeping the read cursor in a local variable of the recursive function: every call must advance the **same** \`pos\`.
- Deserializing with \`parseInt\` on \`"null"\` (gives \`NaN\`) instead of checking for the marker first.
- Deep, chain-like trees can overflow the recursion; an explicit stack or a level-order format avoids that.

## What to watch in the visualizer

- During \`serialize\`, \`parts\` grows one token per call while \`node\` walks the tree in preorder.
- During \`deserialize\`, \`pos\` moves through \`tokens\` and the rebuilt tree \`node\` grows; the call stack depth shows which subtree is being read.
- \`toLevelOrder\` fills \`queue\` and \`result\` breadth-first at the end.

## Example

\`\`\`
Input: values = [1, 2, 3, null, null, 4, 5]
Output: ["1,2,null,null,3,4,null,null,5,null,null", [1, 2, 3, null, null, 4, 5]]
\`\`\`

## Constraints

- The number of nodes is in the range \`[0, 10^4]\`.
- \`-1000 <= Node.val <= 1000\`
`;

export function buildSerializeDeserializeTree(): QuestionInput {
  return {
    slug: "serialize-deserialize-tree",
    title: "Serialize and Deserialize a Binary Tree",
    difficulty: "Hard",
    tags: ["tree", "dfs", "preorder", "design", "string"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        method: "roundTrip",
        args: [[1, 2, 3, null, null, 4, 5]],
        expected: ["1,2,null,null,3,4,null,null,5,null,null", [1, 2, 3, null, null, 4, 5]],
      },
      { method: "roundTrip", args: [[]], expected: ["null", []] },
      // negative and multi-digit values
      { method: "roundTrip", args: [[-7, null, 12]], expected: ["-7,null,12,null,null", [-7, null, 12]] },
      // left-leaning chain: many nested nulls
      { method: "roundTrip", args: [[5, 4, null, 3, null, 2]], expected: ["5,4,3,2,null,null,null,null,null", [5, 4, null, 3, null, 2]] },
    ],
    visualHints: {
      values: "tree",
    },
  };
}
