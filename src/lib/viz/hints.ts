import type { SObject, SValue, TraceFrame, TraceStep, VisualHints, VisualHintType } from "@/lib/tracer/types";
import { isBarsCompatible } from "./bars";
import { isGraphShaped } from "./graph-model";
import { localNamesByObject } from "./pointers";
import type { ObjectTable } from "./types";

const THIS_SEGMENT = "this";
const PATH_SEPARATOR = ".";
const THIS_PREFIX = "this.";
const MIN_TREE_ARRAY_LENGTH = 3;

export interface ParsedHintKey {
  /** True for `this.a.b`: the root is a frame's `this`. */
  isThis: boolean;
  /** Local variable name (empty when isThis). */
  root: string;
  /** Property names after the root. */
  path: string[];
}

export function parseHintKey(key: string): ParsedHintKey | null {
  const segments = key.split(PATH_SEPARATOR);
  if (segments.some((segment) => segment === "")) return null;
  if (segments[0] === THIS_SEGMENT) return { isThis: true, root: "", path: segments.slice(1) };
  return { isThis: false, root: segments[0], path: segments.slice(1) };
}

function arrayIndex(segment: string): number | null {
  return /^\d+$/.test(segment) ? Number(segment) : null;
}

function mapKeyMatches(key: SValue, segment: string): boolean {
  return (key.k === "string" && key.v === segment) || (key.k === "number" && String(key.v) === segment);
}

function stepInto(object: SObject, segment: string): SValue | null {
  switch (object.k) {
    case "object":
      return object.entries.find(([name]) => name === segment)?.[1] ?? null;
    case "map":
      return object.entries.find(([key]) => mapKeyMatches(key, segment))?.[1] ?? null;
    case "array":
    case "heap": {
      const index = arrayIndex(segment);
      return index === null ? null : (object.items[index] ?? null);
    }
    case "set":
      return null;
  }
}

function walkPath(objects: ObjectTable, start: SValue, path: readonly string[]): SValue | null {
  let current: SValue = start;
  for (const segment of path) {
    if (current.k !== "ref") return null;
    const object = objects[current.id];
    const next = object ? stepInto(object, segment) : null;
    if (!next) return null;
    current = next;
  }
  return current;
}

function rootCandidates(frames: readonly TraceFrame[], parsed: ParsedHintKey): SValue[] {
  const innermostFirst = [...frames].reverse();
  if (parsed.isThis) return innermostFirst.map((frame) => frame.self);
  const found: SValue[] = [];
  for (const frame of innermostFirst) {
    const local = [...frame.locals].reverse().find((candidate) => candidate.name === parsed.root);
    if (local) found.push(local.value);
  }
  return found;
}

function resolveKey(step: TraceStep, key: string): number | null {
  const parsed = parseHintKey(key);
  if (!parsed) return null;
  for (const root of rootCandidates(step.frames, parsed)) {
    const target = walkPath(step.objects, root, parsed.path);
    if (target?.k === "ref" && step.objects[target.id]) return target.id;
  }
  return null;
}

/** A level-order tree array has gaps (null) or enough items to branch; shorter arrays are plain lists. */
function isLevelOrderLike(object: SObject): boolean {
  if (object.k !== "array") return false;
  return object.length >= MIN_TREE_ARRAY_LENGTH || object.items.some((item) => item.k === "null");
}

interface NameRule {
  type: VisualHintType;
  /** Lower-case variable names (a `this.` prefix is ignored). */
  names: ReadonlySet<string>;
  /** The shape the object needs for the name to count. */
  isCompatible: (objects: ObjectTable, object: SObject, name: string) => boolean;
}

const nameSet = (...names: string[]): ReadonlySet<string> => new Set(names.map((name) => name.toLowerCase()));

/** Variable-name inference table: first matching rule with a compatible shape wins. */
const NAME_RULES: readonly NameRule[] = [
  { type: "heap", names: nameSet("heap", "minHeap", "maxHeap", "pq", "priorityQueue", "heapq"), isCompatible: (_objects, object) => object.k === "array" },
  {
    type: "bars",
    names: nameSet("height", "heights", "bar", "bars", "histogram", "hist", "walls", "elevation", "skyline"),
    isCompatible: (_objects, object) => isBarsCompatible(object),
  },
  { type: "tree", names: nameSet("tree", "bst", "segTree", "segmentTree"), isCompatible: (_objects, object) => isLevelOrderLike(object) },
  {
    type: "graph",
    names: nameSet("graph", "adj", "adjList", "adjacency", "adjMatrix", "neighbors", "edges", "network", "routes", "flights", "roads"),
    isCompatible: (objects, object, name) => isGraphShaped(objects, object.id, name),
  },
];

function inferFromName(objects: ObjectTable, object: SObject, variable: string): VisualHintType | null {
  const name = variable.startsWith(THIS_PREFIX) ? variable.slice(THIS_PREFIX.length) : variable;
  const lower = name.toLowerCase();
  const rule = NAME_RULES.find((candidate) => candidate.names.has(lower) && candidate.isCompatible(objects, object, name));
  return rule ? rule.type : null;
}

/**
 * Maps object ids to the render type to draw them with (contracts.md section H). Keys of `hints` the question author
 * wrote come first (unmatched or invalid keys are ignored; the first key to claim an id wins); objects held by
 * conventionally named variables (`heights`, `adj`, `pq`, ...) then get an inferred type when their shape fits.
 */
export function resolveHintTargets(step: TraceStep, hints: VisualHints): Map<number, VisualHintType> {
  const targets = new Map<number, VisualHintType>();
  for (const [key, type] of Object.entries(hints)) {
    const id = resolveKey(step, key);
    if (id !== null && !targets.has(id)) targets.set(id, type);
  }
  for (const [id, variable] of localNamesByObject(step)) {
    const object = step.objects[id];
    if (!object || targets.has(id)) continue;
    const inferred = inferFromName(step.objects, object, variable);
    if (inferred) targets.set(id, inferred);
  }
  return targets;
}
