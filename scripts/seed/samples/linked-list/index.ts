import type { QuestionInput } from "@/lib/types/question";
import { buildCircularLinkedList } from "./circular-linked-list";
import { buildCompareLinkedLists } from "./compare-linked-lists";
import { buildDoublyLinkedList } from "./doubly-linked-list";
import { buildMergeTwoSortedLists } from "./merge-two-sorted-lists";
import { buildReverseLinkedListRecursive } from "./reverse-linked-list-recursive";
import { buildSinglyLinkedList } from "./singly-linked-list";

export const LINKED_LIST_SAMPLES: (() => QuestionInput)[] = [
  buildSinglyLinkedList,
  buildDoublyLinkedList,
  buildCircularLinkedList,
  buildReverseLinkedListRecursive,
  buildMergeTwoSortedLists,
  buildCompareLinkedLists,
];
