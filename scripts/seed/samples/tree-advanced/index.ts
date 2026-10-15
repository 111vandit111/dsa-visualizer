import type { QuestionInput } from "@/lib/types/question";
import { buildBTree } from "./b-tree";
import { buildFenwickTree } from "./fenwick-tree";
import { buildRedBlackTree } from "./red-black-tree";
import { buildSegmentTree } from "./segment-tree";
import { buildTrie } from "./trie";

export const TREE_ADVANCED_SAMPLES: (() => QuestionInput)[] = [
  buildRedBlackTree,
  buildBTree,
  buildTrie,
  buildSegmentTree,
  buildFenwickTree,
];
