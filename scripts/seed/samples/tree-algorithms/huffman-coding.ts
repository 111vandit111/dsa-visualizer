import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `function huffmanCodes(text) {
  // 1. Count how often each character appears
  const freq = {};
  for (const ch of text) freq[ch] = (freq[ch] || 0) + 1;
  if (text.length === 0) return [[], 0];

  // 2. One leaf per character. The heap holds [weight, symbols] keys;
  //    nodes[symbols] is the tree for that key (every symbols string is unique)
  const heap = [];
  const nodes = {};
  for (const ch of Object.keys(freq)) {
    nodes[ch] = { val: ch + ":" + freq[ch], symbol: ch, left: null, right: null };
    push(heap, [freq[ch], ch]);
  }

  // 3. Merge the two lightest trees until one tree is left
  while (heap.length > 1) {
    const lightest = pop(heap);
    const second = pop(heap);
    const weight = lightest[0] + second[0];
    const symbols = lightest[1] + second[1];
    const merged = { val: weight, left: nodes[lightest[1]], right: nodes[second[1]] };
    nodes[symbols] = merged;
    push(heap, [weight, symbols]);
  }

  // 4. Read the codes off the tree: left edge = "0", right edge = "1"
  const codes = [];
  function assign(node, code) {
    if (node.left === null) {
      codes.push([node.symbol, code === "" ? "0" : code]); // a lone symbol still needs one bit
      return;
    }
    assign(node.left, code + "0");
    assign(node.right, code + "1");
  }
  const root = nodes[heap[0][1]];
  assign(root, "");
  codes.sort((x, y) => (x[0] < y[0] ? -1 : 1));

  let bits = 0;
  for (const [ch, code] of codes) bits += freq[ch] * code.length;
  return [codes, bits];
}

// Lower weight first; on a tie, the alphabetically smaller symbols string
function lighter(x, y) {
  return x[0] !== y[0] ? x[0] < y[0] : x[1] < y[1];
}

function push(heap, item) {
  heap.push(item);
  let i = heap.length - 1;
  while (i > 0) {
    const parent = Math.floor((i - 1) / 2);
    if (!lighter(heap[i], heap[parent])) break;
    [heap[i], heap[parent]] = [heap[parent], heap[i]];
    i = parent;
  }
}

function pop(heap) {
  const top = heap[0];
  const last = heap.pop();
  if (heap.length === 0) return top;
  heap[0] = last;
  let i = 0;
  while (true) {
    const left = 2 * i + 1;
    const right = left + 1;
    let smallest = i;
    if (left < heap.length && lighter(heap[left], heap[smallest])) smallest = left;
    if (right < heap.length && lighter(heap[right], heap[smallest])) smallest = right;
    if (smallest === i) break;
    [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
    i = smallest;
  }
  return top;
}
`;

const DESCRIPTION = `**Huffman coding** builds the shortest possible prefix-free binary code for a set of symbols with known frequencies: frequent characters get short codes, rare ones get long codes. It is the entropy-coding stage inside DEFLATE (ZIP, gzip, PNG), JPEG and MP3. This sample counts the characters of \`text\`, builds the Huffman tree with a hand-written min-heap, reads off each character's code, and returns the code table (sorted by character) together with the total length of the encoded text in bits.

## Intuition

Put every character in a bucket weighted by its count. Repeatedly glue the **two lightest** buckets together under a new parent; the parent weighs their sum. When one tree remains, a character's code is the path from the root to its leaf (left = 0, right = 1).

The two rarest symbols end up deepest, so they pay the longest codes, and they become siblings that differ only in their last bit. Each merge adds one bit to every symbol inside the merged trees, so the total cost is the sum of all merged weights: always merging the cheapest pair keeps that sum minimal.

**Prefix-free:** characters sit only at **leaves**, so no code is the start of another (a code would have to pass *through* another leaf). The decoder can therefore read bits left to right and emit a character the moment it reaches a leaf, with no separators.

**Optimality (sketch):** in some optimal tree the two least frequent symbols are siblings at the deepest level (swapping them there never increases the cost). Merging them into one symbol of combined weight leaves a smaller problem whose optimal tree, expanded again, is optimal for the original. Induction finishes the proof.

## How it works

1. Count each character in \`freq\`.
2. Make one leaf per character (labelled like \`a:5\`) and push the key \`[weight, symbols]\` into a min-heap. Equal weights are ordered alphabetically by \`symbols\`, so the output is deterministic. \`nodes[symbols]\` finds the tree behind a key.
3. While the heap holds more than one key: pop the lightest and the second lightest, create a parent labelled with their summed weight (\`left\` = lightest, \`right\` = second), and push its key \`[weight, symbols1 + symbols2]\`.
4. Walk the final tree: append \`0\` going left and \`1\` going right; at a leaf, record the code. A text with a single distinct character gets the code \`0\`.
5. Sort the table by character and compute \`bits = Σ freq[ch] · code.length\`.

## Walkthrough

Case 0: \`text = "abracadabra"\`. Heap keys are \`[weight, symbols]\`.

\`\`\`
counts: a 5, b 2, r 2, c 1, d 1
keys pushed: [5,a] [2,b] [2,r] [1,c] [1,d]

merge 1: pop [1,c], [1,d]      -> node 2,  key [2,cd]   (c < d breaks the tie)
merge 2: pop [2,b], [2,cd]     -> node 4,  key [4,bcd]  (b < cd < r)
merge 3: pop [2,r], [4,bcd]    -> node 6,  key [6,rbcd]
merge 4: pop [5,a], [6,rbcd]   -> node 11, key [11,arbcd]  (the root)
\`\`\`

\`\`\`
        11
      0/  \\1
    a:5     6
          0/ \\1
        r:2    4
             0/ \\1
           b:2    2
                0/ \\1
              c:1   d:1
\`\`\`

\`\`\`
a 0       5 x 1 =  5
b 110     2 x 3 =  6
c 1110    1 x 4 =  4
d 1111    1 x 4 =  4
r 10      2 x 2 =  4
total              23 bits   (fixed 3-bit codes would need 33)
\`\`\`

Huffman trees are not unique: breaking ties by creation order instead would merge \`b\` with \`r\` and give the balanced codes a 0, b 110, c 100, d 101, r 111. The total is 23 bits either way, because every Huffman tree is optimal.

## Complexity

| Step | Time | Why |
|------|------|-----|
| count | O(n) | one pass over the text (n characters) |
| build tree | O(k log k) | k distinct symbols: k − 1 merges, each with O(log k) heap operations |
| read codes | O(k · L) | one visit per tree node, plus copying codes of length up to L ≤ k − 1 |
| space | O(k) | heap, tree and table hold O(k) entries (plus the codes themselves) |

With symbols already sorted by frequency, a two-queue method builds the tree in O(k).

## When to use it

- **Strengths:** optimal among codes that assign a whole number of bits per symbol; simple, fast decoding with a table or tree; no patent or licensing issues.
- **vs. fixed-length codes:** fixed codes waste bits whenever frequencies are skewed.
- **vs. arithmetic / ANS coding:** these get closer to the entropy (fractions of a bit per symbol) and win on very skewed data, at the cost of more complex code.
- **Canonical Huffman:** real formats (DEFLATE) transmit only the code lengths and rebuild codes in a canonical order, so the table costs little to send.
- **Weaknesses:** the frequencies (or code table) must be known to both sides; adaptive variants exist but are slower.

## Common pitfalls

- Breaking ties arbitrarily: the codes stay optimal, but encoder and decoder must build the **same** tree. Make tie-breaking deterministic.
- A text with one distinct character: the tree is a single leaf with an empty code; give it one bit.
- Labeling internal nodes as symbols: only leaves carry characters, which is what makes the code prefix-free.
- Using a max-heap or sorting once instead of a priority queue: merged weights must be re-inserted in order.
- Forgetting to transmit the tree or code lengths along with the encoded bits.

## What to watch in the visualizer

- \`heap\` is drawn as a binary heap whose nodes read \`weight,symbols\` (\`2,cd\`, \`11,arbcd\`): watch \`i\`, \`parent\` and \`smallest\` sift keys up and down in \`push\` and \`pop\`.
- \`merged\` (and finally \`root\`) is drawn as a tree: leaves read \`char:count\` (\`a:5\`), internal nodes show their total weight (\`11\`).
- \`freq\` is the count table; \`codes\` fills up as \`assign\` reaches each leaf, and \`code\` shows the path bits so far.

## Example

\`\`\`
Input: text = "abracadabra"
Output: [[["a", "0"], ["b", "110"], ["c", "1110"], ["d", "1111"], ["r", "10"]], 23]
\`\`\`

## Constraints

- \`0 <= text.length <= 10^4\`
- \`text\` consists of printable ASCII characters.
`;

export function buildHuffmanCoding(): QuestionInput {
  return {
    slug: "huffman-coding",
    title: "Huffman Coding",
    difficulty: "Medium",
    tags: ["tree", "greedy", "heap", "compression"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        method: "huffmanCodes",
        args: ["abracadabra"],
        expected: [[["a", "0"], ["b", "110"], ["c", "1110"], ["d", "1111"], ["r", "10"]], 23],
      },
      // all weights tie: ab and cd merge first, then ab + cd
      { method: "huffmanCodes", args: ["aabbccdd"], expected: [[["a", "00"], ["b", "01"], ["c", "10"], ["d", "11"]], 16] },
      // a single distinct character still needs one bit per symbol
      { method: "huffmanCodes", args: ["aaaa"], expected: [[["a", "0"]], 4] },
      { method: "huffmanCodes", args: [""], expected: [[], 0] },
    ],
    visualHints: {
      heap: "heap",
      merged: "tree",
      root: "tree",
      freq: "map",
    },
  };
}
