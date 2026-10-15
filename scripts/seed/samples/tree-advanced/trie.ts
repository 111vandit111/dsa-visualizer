import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `class Trie {
  constructor() {
    this.root = new TrieNode("");
  }

  insert(word) {
    let node = this.root;
    for (const ch of word) {
      // Create the edge for ch the first time any word needs it
      if (node.children[ch] === undefined) node.children[ch] = new TrieNode(ch);
      node = node.children[ch];
    }
    node.setEnd(true);
  }

  search(word) {
    const node = this.walk(word);
    return node !== null && node.isEnd;
  }

  startsWith(prefix) {
    return this.walk(prefix) !== null;
  }

  // Follows the characters of s from the root; null if the path breaks off
  walk(s) {
    let node = this.root;
    for (const ch of s) {
      node = node.children[ch];
      if (node === undefined) return null;
    }
    return node;
  }

  delete(word) {
    return this.remove(this.root, word, 0);
  }

  // Unmarks word below node, then prunes children that no longer lead to any word
  remove(node, word, depth) {
    if (depth === word.length) {
      if (!node.isEnd) return false; // word was never stored
      node.setEnd(false);
      return true;
    }
    const ch = word[depth];
    const child = node.children[ch];
    if (child === undefined) return false;
    const isRemoved = this.remove(child, word, depth + 1);
    if (isRemoved && !child.isEnd && Object.keys(child.children).length === 0) {
      delete node.children[ch];
    }
    return isRemoved;
  }
}

// Declared after Trie: the runner constructs the first top-level class
class TrieNode {
  constructor(letter) {
    this.letter = letter; // character on the edge into this node ("" for the root)
    this.children = {}; // letter -> TrieNode
    this.setEnd(false);
  }

  // isEnd: a stored word ends here. val is only the label drawn on the node, e.g. "t" or "t•"
  setEnd(isEnd) {
    this.isEnd = isEnd;
    this.val = (this.letter === "" ? "root" : this.letter) + (isEnd ? "•" : "");
  }
}
`;

const DESCRIPTION = `A **trie** (prefix tree, from re*trie*val) stores a set of strings by sharing their common prefixes: each edge is one character, and a path from the root spells a prefix. Looking up a word or asking "does any word start with this prefix?" costs time proportional to the length of the string, not to how many words are stored. Tries power autocomplete, spell checkers, IP routing tables and word games. This sample implements \`insert\`, \`search\`, \`startsWith\` and \`delete\`.

## Intuition

Think of a paper dictionary's thumb tabs taken all the way: pick the tab for the first letter, then a sub-tab for the second, and so on. Words that start the same way share the same tabs, so "car", "cart" and "cat" share the path \`c → a\`.

Each node stores:

- \`children\`: a map from the next character to the child node,
- \`isEnd\`: whether a stored word ends exactly here,
- \`letter\` and \`val\`: the character on the edge into the node and the label drawn for it (\`t\`, or \`t•\` when a word ends there). The trie logic never reads them; they only make the picture readable.

\`isEnd\` is what tells a stored word ("car") apart from a mere prefix of a longer word ("ca").

## How it works

1. **insert(word):** start at the root; for each character, create the child if it is missing, then step into it. Mark the last node as a word end with \`setEnd(true)\`.
2. **walk(s):** follow the characters of \`s\` from the root; return the node reached, or \`null\` as soon as an edge is missing.
3. **search(word):** \`walk(word)\` must succeed **and** land on a node with \`isEnd\`.
4. **startsWith(prefix):** \`walk(prefix)\` only has to succeed.
5. **delete(word):** recurse down the word. At the end, clear the mark with \`setEnd(false)\` (return \`false\` if it was not set). On the way back up, delete a child edge when that child is no longer the end of a word and has no children left, so no dead branches remain.

## Walkthrough

Case 0 inserts \`car\`, \`cat\`, \`cart\`, \`dog\`, runs a few queries, and deletes \`cat\`. \`•\` marks \`isEnd\`, as in the node labels.

\`\`\`
insert "car"   root -> c -> a -> r•                 (3 new nodes)
insert "cat"   reuse c, a; new t under a            a has children {r, t}
insert "cart"  reuse c, a, r; new t under r
insert "dog"   new branch d -> o -> g•

root
├─ c
│  └─ a
│     ├─ r•
│     │  └─ t•        "cart"
│     └─ t•           "cat"
└─ d
   └─ o
      └─ g•           "dog"

search "cat"       c, a, t reached, t is marked             true
search "ca"        c, a reached, a is not marked            false
startsWith "ca"    c, a reached                             true
delete "cat"       depth 3: unmark t                         true
                   back at a: t is unmarked and childless -> delete a.children["t"]
                   back at c: a still has r -> keep
search "cat"       a has no t edge                           false
startsWith "do"    d, o reached                              true
\`\`\`

## Complexity

| Operation | Time | Why |
|-----------|------|-----|
| insert / search / startsWith | O(L) | one edge per character of the word or prefix (L = its length) |
| delete | O(L) | one recursive call per character, pruning on the way back |
| space | O(total characters stored) | at most one node per character; shared prefixes are stored once |
| space with array children | O(nodes · alphabet) | a fixed array of 26 slots per node is faster but wastes memory on sparse nodes |

## When to use it

- **Strengths:** prefix queries (\`startsWith\`, autocomplete, "all words with prefix p"), lexicographic order for free (visit children in sorted order), lookups independent of the number of stored words.
- **vs. hash set:** a hash set answers exact lookups in O(L) too but cannot answer prefix queries without scanning every word.
- **vs. sorted array + binary search:** binary search finds a prefix range in O(L · log n) and uses less memory; a trie wins when words are inserted and deleted often.
- **Variants:** compressed (radix/Patricia) tries merge single-child chains to save nodes; ternary search trees cut memory for large alphabets; Aho-Corasick adds failure links for multi-pattern search.
- **Weaknesses:** many small nodes mean poor cache locality and high memory overhead compared to a flat array of strings.

## Common pitfalls

- Treating "reached the node" as "word exists": \`search\` must also check \`isEnd\`, otherwise \`search("ca")\` returns \`true\`.
- Deleting nodes that other words still need: only prune a child that is not the end of a word **and** has no children.
- Deleting a word that is a prefix of another ("car" when "cart" exists) must only clear \`isEnd\`.
- Using a fixed 26-slot children array (index \`ch.charCodeAt(0) - 97\`) and then meeting uppercase letters, digits or Unicode: the index falls outside the array. A map, as here, accepts any character.
- Forgetting the empty string: it is stored by marking the root itself.

## What to watch in the visualizer

- \`this.root\` is drawn as a tree: every node shows its letter (the edges carry the same character), \`•\` marks the end of a word, and new nodes appear as \`insert\` creates them.
- Follow \`node\` as it moves down one edge per character \`ch\`; in \`remove\`, \`depth\` points into \`word\`.
- Watch the last node of each inserted word gain its \`•\` when \`setEnd(true)\` runs, and the \`t•\` branch under \`a\` disappear when \`delete("cat")\` prunes it.

## Example

\`\`\`
Input:
  ["Trie", "insert", "insert", "insert", "insert", "search", "search", "startsWith", "delete", "search", "startsWith"]
  [[], ["car"], ["cat"], ["cart"], ["dog"], ["cat"], ["ca"], ["ca"], ["cat"], ["cat"], ["do"]]
Output:
  [null, null, null, null, null, true, false, true, true, false, true]
\`\`\`

## Constraints

- Words consist of lowercase English letters.
- \`0 <= word.length <= 2000\`; at most \`3 * 10^4\` operations.
`;

export function buildTrie(): QuestionInput {
  return {
    slug: "trie",
    title: "Trie (Prefix Tree)",
    difficulty: "Medium",
    tags: ["tree", "trie", "string", "design"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        ops: ["Trie", "insert", "insert", "insert", "insert", "search", "search", "startsWith", "delete", "search", "startsWith"],
        args: [[], ["car"], ["cat"], ["cart"], ["dog"], ["cat"], ["ca"], ["ca"], ["cat"], ["cat"], ["do"]],
        expected: [null, null, null, null, null, true, false, true, true, false, true],
      },
      {
        // deleting a prefix word only unmarks it; deleting the longer word prunes its tail
        ops: ["Trie", "insert", "insert", "delete", "search", "search", "delete", "search", "startsWith", "startsWith"],
        args: [[], ["car"], ["cart"], ["car"], ["car"], ["cart"], ["cart"], ["cart"], ["car"], ["c"]],
        expected: [null, null, null, true, false, true, true, false, false, false],
      },
      {
        // missing words, repeated deletes and the empty string
        ops: ["Trie", "delete", "insert", "delete", "delete", "search", "insert", "search", "startsWith", "startsWith"],
        args: [[], ["a"], ["ab"], ["a"], ["abc"], ["ab"], [""], [""], [""], ["b"]],
        expected: [null, false, null, false, false, true, null, true, true, false],
      },
    ],
    visualHints: {
      "this.root": "tree",
    },
  };
}
