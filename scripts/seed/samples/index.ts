import type { QuestionInput, QuestionKind } from "@/lib/types/question";
import { buildAllPathsSourceTarget } from "./all-paths-source-target";
import { buildBinaryTreePaths } from "./binary-tree-paths";
import { buildCloneGraph } from "./clone-graph";
import { buildContainerWithMostWater } from "./container-with-most-water";
import { buildCourseSchedule } from "./course-schedule";
import { GRAPH_SAMPLES } from "./graph";
import { buildKthLargestHeap } from "./kth-largest-heap";
import { buildLargestRectangleHistogram } from "./largest-rectangle-histogram";
import { LINKED_LIST_SAMPLES } from "./linked-list";
import { buildLongestSubstringNoRepeat } from "./longest-substring-no-repeat";
import { buildNaryTreeDepth } from "./n-ary-tree-depth";
import { buildNumberOfIslands } from "./number-of-islands";
import { QUEUE_SAMPLES } from "./queue";
import { buildReverseLinkedList } from "./reverse-linked-list";
import { SEARCHING_SAMPLES } from "./searching";
import { SORTING_SAMPLES } from "./sorting";
import { STACK_SAMPLES } from "./stack";
import { TREE_SAMPLES } from "./tree";
import { TREE_ADVANCED_SAMPLES } from "./tree-advanced";
import { TREE_ALGORITHMS_SAMPLES } from "./tree-algorithms";

const PROBLEM_SAMPLES: (() => QuestionInput)[] = [
  buildContainerWithMostWater,
  buildLargestRectangleHistogram,
  buildLongestSubstringNoRepeat,
  buildKthLargestHeap,
  buildReverseLinkedList,
  buildBinaryTreePaths,
  buildNaryTreeDepth,
  buildAllPathsSourceTarget,
  buildCourseSchedule,
  buildNumberOfIslands,
  buildCloneGraph,
];

function withKind(builders: (() => QuestionInput)[], kind: QuestionKind): (() => QuestionInput)[] {
  return builders.map((build) => () => ({ ...build(), kind }));
}

const ALGORITHM_MODULES: Record<string, (() => QuestionInput)[]> = {
  searching: SEARCHING_SAMPLES,
  sorting: SORTING_SAMPLES,
  stack: STACK_SAMPLES,
  queue: QUEUE_SAMPLES,
  "linked-list": LINKED_LIST_SAMPLES,
  tree: TREE_SAMPLES,
  "tree-advanced": TREE_ADVANCED_SAMPLES,
  "tree-algorithms": TREE_ALGORITHMS_SAMPLES,
  graph: GRAPH_SAMPLES,
};

const ALGORITHM_BY_MODULE = Object.fromEntries(
  Object.entries(ALGORITHM_MODULES).map(([name, builders]) => [name, withKind(builders, "algorithm")]),
);

/** Every seeded sample, keyed by module so `check-samples` can run one module at a time. Only `problems` are questions. */
export const SAMPLE_MODULES: Record<string, (() => QuestionInput)[]> = {
  problems: withKind(PROBLEM_SAMPLES, "question"),
  ...ALGORITHM_BY_MODULE,
};

/** Flat list of the algorithm samples, for seeding only those (`seed:samples --only=algorithms`). */
export const ALGORITHM_SAMPLES: (() => QuestionInput)[] = Object.values(ALGORITHM_BY_MODULE).flat();

export const ALL_SAMPLES: (() => QuestionInput)[] = Object.values(SAMPLE_MODULES).flat();
