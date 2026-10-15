import type { QuestionInput } from "@/lib/types/question";
import { buildBubbleSort } from "./bubble-sort";
import { buildSelectionSort } from "./selection-sort";
import { buildInsertionSort } from "./insertion-sort";
import { buildMergeSort } from "./merge-sort";
import { buildQuickSort } from "./quick-sort";
import { buildHeapSort } from "./heap-sort";

export const SORTING_SAMPLES: (() => QuestionInput)[] = [
  buildBubbleSort,
  buildSelectionSort,
  buildInsertionSort,
  buildMergeSort,
  buildQuickSort,
  buildHeapSort,
];
