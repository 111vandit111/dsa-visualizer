import type { SObject, SValue, Trace, TraceFrame, TraceStep } from "@/lib/tracer/types";
import { VIZ_LIMITS } from "./constants";
import { valueKey } from "./diff";
import { EMPTY_STEP_PATHS, type PathModel, type PathSequence, type PathSource, type ReachSet, type StepPaths } from "./overlay-types";

type Points = (readonly SValue[])[];
type NameKind = "array" | "collection" | "reach";

const TOP_LEVEL_NAME = "(top level)";
const MIN_FAMILY_FRAMES = 2;
const MAX_NODE_LOCALS = 2;

/** Words (camelCase / snake_case parts, lower case) that mark a variable as holding a path, by kind. */
const WORDS_BY_KIND: Record<NameKind, readonly string[]> = {
  array: ["path", "route", "trail", "stack", "chain", "walk", "cycle", "combo", "current", "cur"],
  collection: ["paths", "routes", "res", "result", "ans", "answer", "solutions", "queue", "cycles", "components", "groups", "chains"],
  reach: ["visited", "seen", "marked", "explored", "processed", "done", "discovered", "closed", "visiting"],
};
/** Reach-named variables that may also hold a plain path array (cycle detection keeps the current path in `visiting`). */
const PATH_FALLBACK_WORD = "visiting";
/** Multi-word names that mean "reached" even though one of their words is a path word. */
const REACH_PHRASES: ReadonlySet<string> = new Set(["instack", "onstack", "onpath"]);
const KIND_OF_WORD: ReadonlyMap<string, NameKind> = new Map(
  (Object.keys(WORDS_BY_KIND) as NameKind[]).flatMap((kind) => WORDS_BY_KIND[kind].map((word): [string, NameKind] => [word, kind])),
);

function wordsOf(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Classifies a variable name; the last word (the head noun, "resultPath" -> path) wins over earlier ones. */
function classifyName(name: string): NameKind | null {
  const words = wordsOf(name);
  if (REACH_PHRASES.has(words.join(""))) return "reach";
  for (let k = words.length - 1; k >= 0; k--) {
    const kind = KIND_OF_WORD.get(words[k]);
    if (kind) return kind;
  }
  return null;
}

interface SequenceCandidate { key: string; name: string; source: PathSource; isActive: boolean; points: Points }
interface ReachCandidate { key: string; name: string; points: Points }
interface StepCandidates { sequences: SequenceCandidate[]; reached: ReachCandidate[] }

function isPresent(value: SValue | undefined): value is SValue {
  return value !== undefined && value.k !== "null" && value.k !== "undefined";
}

function lastLocal(frame: TraceFrame, name: string): SValue | undefined {
  for (let k = frame.locals.length - 1; k >= 0; k--) if (frame.locals[k].name === name) return frame.locals[k].value;
  return undefined;
}

/** Names of the locals that identify a node in a recursion family: a node ref, or an index pair (row, col). Only `allowed` names count. */
function nodeLocalNames(frame: TraceFrame, objects: TraceStep["objects"], indexVarNames: ReadonlySet<string>, allowed: ReadonlySet<string>): string[] {
  const names: string[] = [];
  let isIntegerPair = false;
  for (const local of frame.locals) {
    if (!allowed.has(local.name)) continue;
    const { value } = local;
    const isNode = value.k === "ref" && objects[value.id]?.k === "object";
    const isIndex = value.k === "number" && Number.isInteger(value.v) && indexVarNames.has(local.name);
    if (!isNode && !isIndex) continue;
    if (names.length === 0) {
      names.push(local.name);
      isIntegerPair = isIndex;
    } else if (isIntegerPair && isIndex) {
      names.push(local.name);
    }
    if (names.length >= MAX_NODE_LOCALS || (names.length === 1 && !isIntegerPair)) break;
  }
  return names;
}

/**
 * What a function's own node locals can be. Frames of nested functions also list the enclosing function's captured
 * variables, so only names that were present when the function was first called (its parameters, not later body
 * locals) and that differ between frames of one recursion at some step (captured variables never do) are allowed.
 */
interface FamilyInfo { callNames: string[]; varying: Set<string> }

function analyzeFamilies(trace: Trace): Map<string, FamilyInfo> {
  const infos = new Map<string, FamilyInfo>();
  for (const step of trace.steps) {
    for (const frame of step.frames) {
      if (frame.name !== TOP_LEVEL_NAME && !infos.has(frame.name)) {
        infos.set(frame.name, { callNames: frame.locals.map((local) => local.name), varying: new Set() });
      }
    }
    for (const [name, family] of framesByName(step.frames)) {
      if (family.length >= MIN_FAMILY_FRAMES) markVarying(infos.get(name) as FamilyInfo, family);
    }
  }
  return infos;
}

function markVarying(info: FamilyInfo, family: readonly TraceFrame[]): void {
  for (const name of info.callNames) {
    if (info.varying.has(name)) continue;
    const first = lastLocal(family[0], name);
    if (first === undefined) continue;
    const firstKey = valueKey(first);
    const isVarying = family.some((frame) => {
      const value = lastLocal(frame, name);
      return value !== undefined && valueKey(value) !== firstKey;
    });
    if (isVarying) info.varying.add(name);
  }
}

function framesByName(frames: readonly TraceFrame[]): Map<string, TraceFrame[]> {
  const groups = new Map<string, TraceFrame[]>();
  for (const frame of frames) {
    if (frame.name === TOP_LEVEL_NAME) continue;
    const group = groups.get(frame.name);
    if (group) group.push(frame);
    else groups.set(frame.name, [frame]);
  }
  return groups;
}

function familyPoints(family: readonly TraceFrame[], names: readonly string[]): Points {
  const points: Points = [];
  for (const frame of family) {
    const values = names.map((name) => lastLocal(frame, name));
    if (!values.every(isPresent)) break;
    points.push(values);
  }
  return points;
}

function trimLast(points: Points): Points {
  return points.length > VIZ_LIMITS.maxPathPoints ? points.slice(-VIZ_LIMITS.maxPathPoints) : points;
}

/** Recursion families: frames of one function (>= 2 deep) become a path of their node locals. */
function callStackSequences(step: TraceStep, namesOf: (family: TraceFrame[]) => string[]): SequenceCandidate[] {
  const innermost = step.frames[step.frames.length - 1];
  const found: SequenceCandidate[] = [];
  for (const [name, family] of framesByName(step.frames)) {
    if (family.length < MIN_FAMILY_FRAMES) continue;
    const names = namesOf(family);
    const points = names.length > 0 ? familyPoints(family, names) : [];
    if (points.length === 0) continue;
    found.push({ key: `fn:${name}`, name, source: "call-stack", isActive: family.includes(innermost), points: trimLast(points) });
  }
  return found;
}

/** Items of a path-like array: numbers/strings or refs to objects (graph/tree nodes). */
function pathItems(objects: TraceStep["objects"], value: SValue): readonly SValue[] | null {
  const target = value.k === "ref" ? objects[value.id] : undefined;
  if (target?.k !== "array") return null;
  const isPathItem = (item: SValue) => item.k === "number" || item.k === "string" || (item.k === "ref" && objects[item.id]?.k === "object");
  return target.items.every(isPathItem) ? target.items : null;
}

function collectionSequences(objects: TraceStep["objects"], name: string, value: SValue, isActive: boolean): SequenceCandidate[] {
  const list = value.k === "ref" ? objects[value.id] : undefined;
  if (list?.k !== "array") return [];
  const inner: (readonly SValue[])[] = [];
  for (const item of list.items) {
    const items = pathItems(objects, item);
    if (!items) return [];
    inner.push(items);
  }
  const found: SequenceCandidate[] = [];
  inner.forEach((items, k) => {
    if (items.length === 0 || found.length >= VIZ_LIMITS.maxPathSequences) return;
    found.push({ key: `var:${name}[${k}]`, name: `${name}[${k}]`, source: "collection", isActive, points: trimLast(items.map((item) => [item])) });
  });
  return found;
}

function isTruthy(value: SValue): boolean {
  switch (value.k) {
    case "boolean":
      return value.v;
    case "number":
      return value.v !== 0 && !Number.isNaN(value.v);
    case "string":
      return value.v !== "";
    case "bigint":
      return value.v !== "0";
    case "undefined":
    case "null":
      return false;
    default:
      return true;
  }
}

function keyValue(name: string): SValue {
  return /^(0|[1-9]\d*)$/.test(name) ? { k: "number", v: Number(name) } : { k: "string", v: name };
}

function isBooleanList(object: SObject | undefined): object is Extract<SObject, { k: "array" }> {
  return object?.k === "array" && object.items.length > 0 && object.items.every((item) => item.k === "boolean");
}

function trueCells(object: Extract<SObject, { k: "array" }>): number[] {
  return object.items.flatMap((item, index) => (item.k === "boolean" && item.v ? [index] : []));
}

/** Reached points of a Set, Map/object with truthy values, boolean array (indices) or boolean 2D array ([row, col]). */
function reachPoints(objects: TraceStep["objects"], value: SValue): Points {
  const target = value.k === "ref" ? objects[value.id] : undefined;
  if (!target) return [];
  switch (target.k) {
    case "set":
      return target.items.map((item) => [item]);
    case "map":
      return target.entries.filter(([, entry]) => isTruthy(entry)).map(([key]) => [key]);
    case "object":
      return target.entries.filter(([, entry]) => isTruthy(entry)).map(([name]) => [keyValue(name)]);
    case "array":
      return isBooleanList(target) ? trueCells(target).map((index) => [{ k: "number", v: index }]) : gridReachPoints(objects, target);
    default:
      return [];
  }
}

function gridReachPoints(objects: TraceStep["objects"], grid: Extract<SObject, { k: "array" }>): Points {
  const rows = grid.items.map((item) => (item.k === "ref" ? objects[item.id] : undefined));
  const isRow = (row: SObject | undefined) => row?.k === "array" && row.items.every((item) => item.k === "boolean");
  if (!rows.some(isBooleanList) || !rows.every(isRow)) return [];
  return rows.flatMap((row, r) => (isBooleanList(row) ? trueCells(row).map((c): readonly SValue[] => [{ k: "number", v: r }, { k: "number", v: c }]) : []));
}

/** Path-like and reach-like variables; for a name that exists in several frames the innermost one wins. */
function variableCandidates(step: TraceStep, classify: (name: string) => NameKind | null): StepCandidates {
  const result: StepCandidates = { sequences: [], reached: [] };
  const innermost = step.frames.length - 1;
  const seen = new Set<string>();
  for (let f = innermost; f >= 0; f--) {
    const { locals } = step.frames[f];
    for (const { name, value } of locals) {
      if (seen.has(name)) continue;
      seen.add(name);
      addVariable(result, step.objects, { name, value, isActive: f === innermost }, classify(name));
    }
  }
  return result;
}

function addVariable(result: StepCandidates, objects: TraceStep["objects"], local: { name: string; value: SValue; isActive: boolean }, kind: NameKind | null): void {
  const { name, value, isActive } = local;
  if (kind === "array") {
    const items = pathItems(objects, value);
    if (items && items.length > 0) {
      result.sequences.push({ key: `var:${name}`, name, source: "array", isActive, points: trimLast(items.map((item) => [item])) });
    }
  } else if (kind === "collection") {
    result.sequences.push(...collectionSequences(objects, name, value, isActive));
  } else if (kind === "reach") {
    const points = reachPoints(objects, value);
    if (points.length > 0) result.reached.push({ key: `var:${name}`, name, points: points.slice(0, VIZ_LIMITS.maxReachPoints) });
    else if (wordsOf(name).includes(PATH_FALLBACK_WORD)) addVariable(result, objects, local, "array");
  }
}

/**
 * Per-step path data for the graph/tree/grid renderers. Slots are assigned over the whole trace in first-appearance
 * order of the path key (function name, variable name, or `name[k]`), starting at `firstSlot`, so colours stay put
 * while scrubbing. `slotCount` = highest slot in use + 1 (includes the `firstSlot` slots owned by pointers).
 */
export function buildPathModel(trace: Trace, firstSlot: number, indexVarNames: ReadonlySet<string>): PathModel {
  const slots = new Map<string, number>();
  const slotOf = (key: string): number => {
    let slot = slots.get(key);
    if (slot === undefined) {
      slot = firstSlot + slots.size;
      slots.set(key, slot);
    }
    return slot;
  };
  const nameCache = new Map<string, NameKind | null>();
  const classify = (name: string): NameKind | null => {
    if (!nameCache.has(name)) nameCache.set(name, classifyName(name));
    return nameCache.get(name) ?? null;
  };
  const families = analyzeFamilies(trace);
  const familyNames = new Map<string, string[]>();

  const steps = trace.steps.map((step): StepPaths => {
    const namesOf = (family: TraceFrame[]): string[] => {
      const cached = familyNames.get(family[0].name);
      if (cached) return cached;
      const info = families.get(family[0].name) as FamilyInfo;
      const allowed = new Set(info.callNames.filter((name) => info.varying.has(name)));
      for (const candidate of family) {
        const names = nodeLocalNames(candidate, step.objects, indexVarNames, allowed);
        if (names.length === 0) continue;
        familyNames.set(family[0].name, names);
        return names;
      }
      return [];
    };
    const variables = variableCandidates(step, classify);
    const sequences = [...callStackSequences(step, namesOf), ...variables.sequences].slice(0, VIZ_LIMITS.maxPathSequences);
    if (sequences.length === 0 && variables.reached.length === 0) return EMPTY_STEP_PATHS;
    return {
      sequences: sequences.map((candidate): PathSequence => ({ name: candidate.name, slot: slotOf(candidate.key), source: candidate.source, isActive: candidate.isActive, points: candidate.points })),
      reached: variables.reached.map((candidate): ReachSet => ({ name: candidate.name, slot: slotOf(candidate.key), points: candidate.points })),
    };
  });

  return { slotCount: firstSlot + slots.size, at: (stepIndex) => steps[stepIndex] ?? EMPTY_STEP_PATHS };
}

/** Resolves path points to node indices; unresolved points and consecutive duplicates are dropped. */
export function resolvePathNodes(points: PathSequence["points"], nodeIndexOf: (point: readonly SValue[]) => number | null): number[] {
  const nodes: number[] = [];
  for (const point of points) {
    const index = nodeIndexOf(point);
    if (index !== null && nodes[nodes.length - 1] !== index) nodes.push(index);
  }
  return nodes;
}
