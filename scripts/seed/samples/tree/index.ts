import type { QuestionInput } from "@/lib/types/question";
import { buildAvlTree } from "./avl-tree";
import { buildBstDeletion } from "./bst-deletion";
import { buildBstInsertion } from "./bst-insertion";
import { buildBstSearch } from "./bst-search";
import { buildInorderTraversal } from "./inorder-traversal";
import { buildLevelOrderTraversal } from "./level-order-traversal";
import { buildMorrisTraversal } from "./morris-traversal";
import { buildPostorderTraversal } from "./postorder-traversal";
import { buildPreorderTraversal } from "./preorder-traversal";

export const TREE_SAMPLES: (() => QuestionInput)[] = [
  buildBstInsertion,
  buildBstSearch,
  buildBstDeletion,
  buildAvlTree,
  buildPreorderTraversal,
  buildInorderTraversal,
  buildPostorderTraversal,
  buildLevelOrderTraversal,
  buildMorrisTraversal,
];
