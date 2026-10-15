import type { SValue, Trace, TraceFrame, TraceStep } from "@/lib/tracer/types";
import { extractIndexEvidence } from "./pointer-evidence";
import { collectContainedIds, findCaptures, nameObjects, resolveIndexTargets, type FrameContext } from "./pointer-resolve";
import {
  EMPTY_STEP_POINTERS,
  NULL_HOST,
  objectHost,
  type IndexEvidence,
  type Pointer,
  type PointerKind,
  type PointerModel,
  type PointerRange,
  type PointerTarget,
  type StepPointers,
} from "./overlay-types";

/** Variable name pairs that bound a window; the first name is the window start. */
const RANGE_NAME_PAIRS: readonly (readonly [string, string])[] = [
  ["left", "right"], ["l", "r"], ["lo", "hi"], ["low", "high"], ["start", "end"], ["begin", "end"], ["head", "tail"], ["front", "back"],
];
const NO_POINTERS: readonly Pointer[] = [];
const NO_RANGES: readonly PointerRange[] = [];
const NULL_VALUE: SValue = { k: "null" };

/** A pointer before its colour slot is known (slots need the whole trace). */
interface PointerDraft {
  name: string;
  kind: PointerKind;
  frameId: number;
  /** Position in `step.frames` (0 = outermost). */
  frameDepth: number;
  isActive: boolean;
  target: PointerTarget;
  value: SValue;
  isOutOfRange: boolean;
}

interface NullDraft { name: string; frameId: number; frameDepth: number; isActive: boolean }
interface StepDraft { pointers: PointerDraft[]; nulls: NullDraft[] }

interface DraftContext {
  frames: FrameContext;
  evidence: IndexEvidence;
  /** Ids held by another object; computed on first use (most steps never need it). */
  containedIds(): ReadonlySet<number>;
}

interface FrameInfo { frameId: number; frameDepth: number; isActive: boolean }

/** Locals with shadowed duplicates collapsed to the last (innermost) declaration. */
function visibleLocals(locals: TraceFrame["locals"]): TraceFrame["locals"] {
  const last = new Map(locals.map((local, index) => [local.name, index]));
  return last.size === locals.length ? locals : locals.filter((local, index) => last.get(local.name) === index);
}

/** A reference pointer: an `object`, or an array/map/set/heap that another object holds (a row, a node's list). */
function refTarget(ctx: DraftContext, name: string, value: SValue): PointerTarget | null {
  if (value.k !== "ref" || name === "this") return null;
  const object = ctx.frames.objects[value.id];
  if (!object) return null;
  return object.k === "object" || ctx.containedIds().has(object.id) ? { host: objectHost(object.id), cellKey: null } : null;
}

function draftLocal(ctx: DraftContext, frameIndex: number, name: string, value: SValue, info: FrameInfo, draft: StepDraft): void {
  if (value.k === "null") {
    draft.nulls.push({ name, ...info });
    return;
  }
  if (value.k === "ref") {
    const target = refTarget(ctx, name, value);
    if (target) draft.pointers.push({ name, kind: "ref", ...info, target, value, isOutOfRange: false });
    return;
  }
  for (const found of resolveIndexTargets(ctx.frames, frameIndex, name, value, ctx.evidence.get(name))) {
    draft.pointers.push({ name, kind: "index", ...info, target: found.target, value, isOutOfRange: found.isOutOfRange });
  }
}

function draftStep(step: TraceStep, evidence: IndexEvidence): StepDraft {
  let contained: Set<number> | null = null;
  const ctx: DraftContext = {
    frames: { frames: step.frames, objects: step.objects },
    evidence,
    containedIds: () => (contained ??= collectContainedIds(step.objects)),
  };
  const draft: StepDraft = { pointers: [], nulls: [] };
  if (step.frames.length === 0) return draft;
  const captures = findCaptures(step.frames);
  const innermost = step.frames.length - 1;
  // A variable the active frame borrows from an enclosing frame is drawn once, on its owner, but is not dimmed.
  const borrowed = new Set(step.frames[innermost].locals.slice(0, captures[innermost].count).map((local) => local.name));
  step.frames.forEach((frame, frameIndex) => {
    const info: FrameInfo = { frameId: frame.id, frameDepth: frameIndex, isActive: frameIndex === innermost };
    for (const local of visibleLocals(frame.locals.slice(captures[frameIndex].count))) {
      const isActive = info.isActive || (frameIndex === captures[innermost].owner && borrowed.has(local.name));
      draftLocal(ctx, frameIndex, local.name, local.value, { ...info, isActive }, draft);
    }
  });
  return draft;
}

interface TraceScan {
  drafts: StepDraft[];
  /** Pointer name -> colour slot, in first-appearance order over the whole trace. */
  slots: Map<string, number>;
  /** Names that were reference pointers at some step (candidates for "now null"). */
  refNames: Set<string>;
  indexNames: Set<string>;
}

function scanTrace(steps: readonly TraceStep[], evidence: IndexEvidence): TraceScan {
  const scan: TraceScan = { drafts: [], slots: new Map(), refNames: new Set(), indexNames: new Set() };
  for (const step of steps) {
    const draft = draftStep(step, evidence);
    scan.drafts.push(draft);
    for (const pointer of draft.pointers) {
      if (!scan.slots.has(pointer.name)) scan.slots.set(pointer.name, scan.slots.size);
      (pointer.kind === "ref" ? scan.refNames : scan.indexNames).add(pointer.name);
    }
  }
  return scan;
}

function cellId(host: string, cellKey: string | null): string {
  return cellKey === null ? host : `${host}\u0000${cellKey}`;
}

function pushTo<K, V>(groups: Map<K, V[]>, key: K, item: V): void {
  const list = groups.get(key);
  if (list) list.push(item);
  else groups.set(key, [item]);
}

/** Windows bounded by two in-range index pointers of one frame on one host whose names pair up (left/right...). */
function buildRanges(pointers: readonly Pointer[]): Map<string, PointerRange[]> {
  const groups = new Map<string, Map<string, Pointer>>();
  for (const pointer of pointers) {
    if (pointer.kind !== "index" || pointer.isOutOfRange) continue;
    const key = `${pointer.frameId}|${pointer.target.host}`;
    const byName = groups.get(key) ?? new Map<string, Pointer>();
    byName.set(pointer.name.toLowerCase(), pointer);
    groups.set(key, byName);
  }
  const ranges = new Map<string, PointerRange[]>();
  for (const byName of groups.values()) {
    for (const [startName, endName] of RANGE_NAME_PAIRS) {
      const start = byName.get(startName);
      const end = byName.get(endName);
      if (!start || !end) continue;
      const from = Number(start.target.cellKey);
      const to = Number(end.target.cellKey);
      if (Number.isNaN(from) || Number.isNaN(to)) continue;
      pushTo(ranges, start.target.host, { host: start.target.host, from: Math.min(from, to), to: Math.max(from, to), start, end });
    }
  }
  return ranges;
}

function toPointer(draft: PointerDraft, slot: number): Pointer {
  return {
    name: draft.name,
    slot,
    kind: draft.kind,
    frameId: draft.frameId,
    isActive: draft.isActive,
    target: draft.target,
    value: draft.value,
    isOutOfRange: draft.isOutOfRange,
  };
}

function toNullPointer(draft: NullDraft, slot: number): Pointer {
  return {
    name: draft.name,
    slot,
    kind: "ref",
    frameId: draft.frameId,
    isActive: draft.isActive,
    target: { host: NULL_HOST, cellKey: null },
    value: NULL_VALUE,
    isOutOfRange: false,
  };
}

/** One pointer per (name, target): when several frames hold equal values, the first (innermost) wins. */
function dropRepeats(pointers: readonly Pointer[]): Pointer[] {
  const seen = new Set<string>();
  return pointers.filter((pointer) => {
    const key = `${pointer.name}|${pointer.target.host}|${pointer.target.cellKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function finalizeStep(draft: StepDraft, scan: TraceScan): StepPointers {
  const slotOf = (name: string): number => scan.slots.get(name) ?? 0;
  // Legend order: slot ascending; within a slot the innermost (active) frame first.
  const ordered = [...draft.pointers]
    .sort((a, b) => slotOf(a.name) - slotOf(b.name) || b.frameDepth - a.frameDepth)
    .map((entry) => toPointer(entry, slotOf(entry.name)));
  const all = dropRepeats(ordered);
  const nulls = draft.nulls
    .filter((entry) => scan.refNames.has(entry.name))
    .map((entry) => toNullPointer(entry, slotOf(entry.name)))
    .sort((a, b) => a.slot - b.slot);
  const inRange = new Map<string, Pointer[]>();
  const outOfRange = new Map<string, Pointer[]>();
  for (const pointer of all) {
    if (pointer.isOutOfRange) pushTo(outOfRange, pointer.target.host, pointer);
    else pushTo(inRange, cellId(pointer.target.host, pointer.target.cellKey), pointer);
  }
  const ranges = buildRanges(ordered);
  return {
    all,
    nulls,
    at: (host, cellKey) => inRange.get(cellId(host, cellKey)) ?? NO_POINTERS,
    outOfRange: (host) => outOfRange.get(host) ?? NO_POINTERS,
    ranges: (host) => ranges.get(host) ?? NO_RANGES,
  };
}

/**
 * Pointers per step: which locals are positions (`i`, `left`) or references (`curr`) and where they point.
 * Colour slots are assigned over the whole trace up front so a name keeps its colour while scrubbing;
 * each step's lookup tables are built on first request and memoised.
 */
export function buildPointerModel(trace: Trace, code: string): PointerModel {
  const scan = scanTrace(trace.steps, extractIndexEvidence(code));
  const cache = new Map<number, StepPointers>();
  return {
    slotCount: scan.slots.size,
    slotOf: (name) => scan.slots.get(name),
    indexVarNames: scan.indexNames,
    at(stepIndex) {
      const draft = scan.drafts[stepIndex];
      if (!draft) return EMPTY_STEP_POINTERS;
      const cached = cache.get(stepIndex);
      if (cached) return cached;
      const built = finalizeStep(draft, scan);
      cache.set(stepIndex, built);
      return built;
    },
  };
}

/** Object id -> variable name: locals innermost frame first, then `this.<field>` names. */
export function localNamesByObject(step: TraceStep): Map<number, string> {
  return nameObjects(step.frames, step.objects);
}
