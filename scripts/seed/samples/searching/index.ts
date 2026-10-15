import type { QuestionInput } from "@/lib/types/question";
import { buildLinearSearch } from "./linear-search";
import { buildBinarySearch } from "./binary-search";

export const SEARCHING_SAMPLES: (() => QuestionInput)[] = [
  buildLinearSearch,
  buildBinarySearch,
];
