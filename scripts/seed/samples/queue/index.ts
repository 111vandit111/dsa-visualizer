import type { QuestionInput } from "@/lib/types/question";
import { buildQueueArray } from "./queue-array";
import { buildQueueLinkedList } from "./queue-linked-list";
import { buildDeque } from "./deque";
import { buildCircularQueue } from "./circular-queue";
import { buildPriorityQueue } from "./priority-queue";

export const QUEUE_SAMPLES: (() => QuestionInput)[] = [
  buildQueueArray,
  buildQueueLinkedList,
  buildDeque,
  buildCircularQueue,
  buildPriorityQueue,
];
