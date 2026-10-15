import type { SObject, SValue, TraceFrame } from "@/lib/tracer/types";
import { valueKey } from "./diff";
import { FALLBACK_INDEX_NAMES } from "./pointer-evidence";
import { objectHost, stringHost, type IndexUse, type PointerTarget } from "./overlay-types";
import type { ObjectTable } from "./types";

/** Index pointers drawn per variable name (one per distinct base it indexes). */
export const MAX_BASES_PER_NAME = 3;
const NUMBER_LITERAL = /^\d+$/;

export interface FrameContext {
  frames: readonly TraceFrame[];
  objects: ObjectTable;
}

export interface IndexTarget {
  target: PointerTarget;
  isOutOfRange: boolean;
}

/** What a position/key points into: a heap container or a string local (`text`). */
interface IndexContainer {
  host: string;
  object: SObject | null;
  text: string | null;
}

interface LocatedLocal {
  value: SValue;
  frame: TraceFrame;
}

function findLocal(frame: TraceFrame, name: string): SValue | null {
  for (let i = frame.locals.length - 1; i >= 0; i--) {
    if (frame.locals[i].name === name) return frame.locals[i].value;
  }
  return null;
}

/** A variable of the frame, else of the nearest enclosing frame that has it (closures read outer variables). */
function lookupLocal(ctx: FrameContext, frameIndex: number, name: string): LocatedLocal | null {
  for (let i = frameIndex; i >= 0; i--) {
    const value = findLocal(ctx.frames[i], name);
    if (value) return { value, frame: ctx.frames[i] };
  }
  return null;
}

function lookupSelf(ctx: FrameContext, frameIndex: number): LocatedLocal | null {
  for (let i = frameIndex; i >= 0; i--) {
    const self = ctx.frames[i].self;
    if (self.k === "ref") return { value: self, frame: ctx.frames[i] };
  }
  return null;
}

function entryValue(ctx: FrameContext, value: SValue, name: string): SValue | null {
  const object = value.k === "ref" ? ctx.objects[value.id] : undefined;
  if (object?.k !== "object") return null;
  return object.entries.find(([entryName]) => entryName === name)?.[1] ?? null;
}

interface ResolvedBase {
  value: SValue;
  /** Host of the string when the base is a plain string local, else null. */
  stringHost: string | null;
}

/** `nums` (a local, or an outer frame's) or `this.nums` / `a.b.c` (entries of the receiver / object). */
function resolveBase(ctx: FrameContext, frameIndex: number, base: string): ResolvedBase | null {
  const [first, ...rest] = base.split(".");
  const located = first === "this" ? lookupSelf(ctx, frameIndex) : lookupLocal(ctx, frameIndex, first);
  if (!located) return null;
  let value = located.value;
  for (const segment of rest) {
    const next = entryValue(ctx, value, segment);
    if (!next) return null;
    value = next;
  }
  const isStringLocal = rest.length === 0 && first !== "this" && value.k === "string";
  return { value, stringHost: isStringLocal ? stringHost(located.frame.id, first) : null };
}

/** The key a `via` name stands for: a number literal, or the current value of that variable. */
function viaKey(ctx: FrameContext, frameIndex: number, name: string): SValue | null {
  if (NUMBER_LITERAL.test(name)) return { k: "number", v: Number(name) };
  const value = name === "" ? null : (lookupLocal(ctx, frameIndex, name)?.value ?? null);
  return value && (value.k === "number" || value.k === "string") ? value : null;
}

/** The value stored under `key` in a container (array/heap position, map key, object entry). */
function childValue(object: SObject, key: SValue): SValue | null {
  if (object.k === "array" || object.k === "heap") {
    return key.k === "number" && Number.isInteger(key.v) ? (object.items[key.v] ?? null) : null;
  }
  if (object.k === "map") return object.entries.find(([entryKey]) => valueKey(entryKey) === valueKey(key))?.[1] ?? null;
  if (object.k === "object" && (key.k === "number" || key.k === "string")) {
    return object.entries.find(([name]) => name === String(key.v))?.[1] ?? null;
  }
  return null;
}

/** Walks `via` (the row variables of `dp[i][j]`) from the resolved base down to the object that is finally indexed. */
function followVia(ctx: FrameContext, frameIndex: number, start: SValue, via: readonly string[]): SValue | null {
  let current = start;
  for (const name of via) {
    const key = viaKey(ctx, frameIndex, name);
    const object = current.k === "ref" ? ctx.objects[current.id] : undefined;
    const next = key && object ? childValue(object, key) : null;
    if (!next) return null;
    current = next;
  }
  return current;
}

function containerOf(ctx: FrameContext, frameIndex: number, base: ResolvedBase, use: IndexUse): IndexContainer | null {
  const value = followVia(ctx, frameIndex, base.value, use.via);
  if (!value) return null;
  if (value.k === "string") {
    return use.via.length === 0 && base.stringHost ? { host: base.stringHost, object: null, text: value.v } : null;
  }
  const object = value.k === "ref" ? ctx.objects[value.id] : undefined;
  return object ? { host: objectHost(object.id), object, text: null } : null;
}

/** Fallback base for conventional index names: the frame's first array or string local. */
function firstSequenceLocal(ctx: FrameContext, frame: TraceFrame): IndexContainer | null {
  for (const local of frame.locals) {
    const { value } = local;
    if (value.k === "string") return { host: stringHost(frame.id, local.name), object: null, text: value.v };
    const object = value.k === "ref" ? ctx.objects[value.id] : undefined;
    if (object?.k === "array") return { host: objectHost(object.id), object, text: null };
  }
  return null;
}

function positionTarget(host: string, value: SValue, length: number): IndexTarget | null {
  if (value.k !== "number" || !Number.isInteger(value.v)) return null;
  return { target: { host, cellKey: String(value.v) }, isOutOfRange: value.v < 0 || value.v >= length };
}

function keyedTarget(host: string, cellKey: string, exists: boolean): IndexTarget | null {
  return exists ? { target: { host, cellKey }, isOutOfRange: false } : null;
}

function targetIn(container: IndexContainer, value: SValue): IndexTarget | null {
  const { object, host } = container;
  if (container.text !== null) return positionTarget(host, value, container.text.length);
  if (!object) return null;
  switch (object.k) {
    case "array":
      return positionTarget(host, value, object.length);
    case "heap":
      return positionTarget(host, value, object.size);
    case "map": {
      const key = valueKey(value);
      return keyedTarget(host, key, object.entries.some(([entryKey]) => valueKey(entryKey) === key));
    }
    case "set": {
      const key = valueKey(value);
      return keyedTarget(host, key, object.items.some((item) => valueKey(item) === key));
    }
    case "object": {
      const name = String(value.k === "number" || value.k === "string" ? value.v : "");
      return keyedTarget(host, name, object.entries.some(([entryName]) => entryName === name));
    }
  }
}

function isKeyValue(value: SValue): boolean {
  return (value.k === "number" && Number.isFinite(value.v)) || value.k === "string";
}

function addTarget(found: Map<string, IndexTarget>, target: IndexTarget | null): void {
  if (target) found.set(`${target.target.host}|${target.target.cellKey}`, target);
}

/**
 * Where a variable with a number/string value points: one target per distinct base it indexes (up to MAX_BASES_PER_NAME),
 * from the code's index evidence. A conventional name (`i`, `left`) none of whose evidence bases exist in this frame
 * falls back to the frame's first array/string local, but only when that lands inside it.
 */
export function resolveIndexTargets(
  ctx: FrameContext,
  frameIndex: number,
  name: string,
  value: SValue,
  uses: readonly IndexUse[] | undefined,
): IndexTarget[] {
  if (!isKeyValue(value)) return [];
  const found = new Map<string, IndexTarget>();
  let hasBase = false;
  for (const use of uses ?? []) {
    if (found.size >= MAX_BASES_PER_NAME) break;
    const base = resolveBase(ctx, frameIndex, use.base);
    if (!base) continue;
    hasBase = true;
    const container = containerOf(ctx, frameIndex, base, use);
    addTarget(found, container ? targetIn(container, value) : null);
  }
  if (!hasBase && value.k === "number" && FALLBACK_INDEX_NAMES.has(name)) {
    const container = firstSequenceLocal(ctx, ctx.frames[frameIndex]);
    const guess = container ? targetIn(container, value) : null;
    if (guess && !guess.isOutOfRange) addTarget(found, guess);   // a guess must at least land on a cell
  }
  return [...found.values()];
}

/** Ids of objects that another object holds a reference to (as an item, entry value or map key). */
export function collectContainedIds(objects: ObjectTable): Set<number> {
  const contained = new Set<number>();
  const add = (value: SValue, ownerId: number): void => {
    if (value.k === "ref" && value.id !== ownerId) contained.add(value.id);
  };
  for (const object of Object.values(objects)) {
    if (object.k === "object") for (const [, value] of object.entries) add(value, object.id);
    else if (object.k === "map") {
      for (const [key, value] of object.entries) {
        add(key, object.id);
        add(value, object.id);
      }
    } else for (const item of object.items) add(item, object.id);
  }
  return contained;
}

/**
 * Names of the objects reachable from a step's variables: locals innermost frame first (earliest declaration wins),
 * then `this.<field>` for the receivers' reference fields.
 */
export function nameObjects(frames: readonly TraceFrame[], objects: ObjectTable): Map<number, string> {
  const names = new Map<number, string>();
  for (let i = frames.length - 1; i >= 0; i--) {
    for (const local of frames[i].locals) {
      if (local.value.k === "ref" && !names.has(local.value.id)) names.set(local.value.id, local.name);
    }
  }
  const seenReceivers = new Set<number>();
  for (let i = frames.length - 1; i >= 0; i--) {
    const self = frames[i].self;
    const receiver = self.k === "ref" && !seenReceivers.has(self.id) ? objects[self.id] : undefined;
    if (receiver?.k !== "object") continue;
    seenReceivers.add(receiver.id);
    for (const [field, value] of receiver.entries) {
      if (value.k === "ref" && !names.has(value.id)) names.set(value.id, `this.${field}`);
    }
  }
  return names;
}

/** Leading locals of a nested function's frame that borrow variables of an enclosing frame. */
export interface Capture {
  count: number;
  /** Index in the frame list of the frame that owns the borrowed variables (-1 when none). */
  owner: number;
}

const NO_CAPTURE: Capture = { count: 0, owner: -1 };

/** How many leading locals of `inner` repeat `outer`'s locals one by one (same name, same value = same binding). */
function sharedPrefixLength(outer: TraceFrame["locals"], inner: TraceFrame["locals"]): number {
  let count = 0;
  while (count < outer.length && count < inner.length) {
    const isSame = outer[count].name === inner[count].name && valueKey(outer[count].value) === valueKey(inner[count].value);
    if (!isSame) break;
    count += 1;
  }
  return count;
}

/**
 * The tracer lists an enclosing function's variables first in the frame of every nested function (siftUp's frame starts
 * with findKthLargest's nums, k, heap). Those are the same bindings, not new variables: per frame, the longest such
 * prefix shared with an outer frame of a DIFFERENT function (recursion frames of one function own their parameters),
 * attributed to the outermost frame that has it.
 */
export function findCaptures(frames: readonly TraceFrame[]): Capture[] {
  const withLocals = frames.map((frame, index) => (frame.locals.length > 0 ? index : -1)).filter((index) => index >= 0);
  return frames.map((frame, index) => {
    let best = NO_CAPTURE;
    for (const owner of withLocals) {
      if (owner >= index) break;
      if (frames[owner].name === frame.name) continue;
      const count = sharedPrefixLength(frames[owner].locals, frame.locals);
      if (count > best.count) best = { count, owner };
    }
    return best;
  });
}
