import type { QuestionInput } from "@/lib/types/question";
import { buildStackArray } from "./stack-array";
import { buildStackLinkedList } from "./stack-linked-list";
import { buildPostfixEvaluation } from "./postfix-evaluation";
import { buildPrefixEvaluation } from "./prefix-evaluation";

export const STACK_SAMPLES: (() => QuestionInput)[] = [
  buildStackArray,
  buildStackLinkedList,
  buildPostfixEvaluation,
  buildPrefixEvaluation,
];
