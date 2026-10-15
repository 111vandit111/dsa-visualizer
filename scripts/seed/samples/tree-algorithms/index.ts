import type { QuestionInput } from "@/lib/types/question";
import { buildDecisionTree } from "./decision-tree";
import { buildHuffmanCoding } from "./huffman-coding";
import { buildLowestCommonAncestor } from "./lowest-common-ancestor";
import { buildSerializeDeserializeTree } from "./serialize-deserialize-tree";
import { buildSyntaxTree } from "./syntax-tree";
import { buildTreeDiameter } from "./tree-diameter";
import { buildTreeIsomorphism } from "./tree-isomorphism";

export const TREE_ALGORITHMS_SAMPLES: (() => QuestionInput)[] = [
  buildLowestCommonAncestor,
  buildTreeDiameter,
  buildTreeIsomorphism,
  buildSerializeDeserializeTree,
  buildHuffmanCoding,
  buildDecisionTree,
  buildSyntaxTree,
];
