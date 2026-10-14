import type { SObject, SValue, TraceFrame, TraceStep, VisualHints, VisualHintType } from "@/lib/tracer/types";
import type { ObjectTable } from "./types";

const THIS_SEGMENT = "this";
const PATH_SEPARATOR = ".";

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

/**
 * Maps object ids to the render type the question author asked for (contracts.md section H).
 * Unmatched or invalid keys are ignored. The first key to claim an id wins.
 */
export function resolveHintTargets(step: TraceStep, hints: VisualHints): Map<number, VisualHintType> {
  const targets = new Map<number, VisualHintType>();
  for (const [key, type] of Object.entries(hints)) {
    const id = resolveKey(step, key);
    if (id !== null && !targets.has(id)) targets.set(id, type);
  }
  return targets;
}
