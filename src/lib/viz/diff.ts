import type { SObject, SValue, TraceStep } from "@/lib/tracer/types";
import type { CellStatus, ObjectTable } from "./types";

/** Cell keys inside one container: array/heap index, object entry name, map key signature, set item signature. */
export interface ContainerDiff {
  added: ReadonlySet<string>;
  removed: ReadonlySet<string>;
  changed: ReadonlySet<string>;
}

export interface StepDiff {
  /** Objects that did not exist in the previous step. */
  newIds: ReadonlySet<number>;
  /** Only containers that differ from the previous step. */
  containers: ReadonlyMap<number, ContainerDiff>;
}

export const EMPTY_DIFF: StepDiff = { newIds: new Set(), containers: new Map() };

/** Stable signature of a value: equal signatures mean the same primitive or the same object identity. */
export function valueKey(value: SValue): string {
  switch (value.k) {
    case "ref":
      return `r:${value.id}`;
    case "number":
    case "boolean":
    case "string":
    case "bigint":
    case "symbol":
      return `${value.k}:${String(value.v)}`;
    case "function":
      return `function:${value.name}`;
    case "opaque":
      return `opaque:${value.label}`;
    case "undefined":
    case "null":
      return value.k;
  }
}

/** Map from cell key to the signature of what the cell holds. */
export function containerCells(object: SObject): Map<string, string> {
  const cells = new Map<string, string>();
  switch (object.k) {
    case "array":
    case "heap":
      object.items.forEach((item, index) => cells.set(String(index), valueKey(item)));
      break;
    case "object":
      for (const [name, value] of object.entries) cells.set(name, valueKey(value));
      break;
    case "map":
      for (const [key, value] of object.entries) cells.set(valueKey(key), valueKey(value));
      break;
    case "set":
      for (const item of object.items) cells.set(valueKey(item), valueKey(item));
      break;
  }
  return cells;
}

function diffCells(before: Map<string, string>, after: Map<string, string>): ContainerDiff | null {
  const added = new Set<string>();
  const removed = new Set<string>();
  const changed = new Set<string>();
  for (const [key, signature] of after) {
    const previous = before.get(key);
    if (previous === undefined) added.add(key);
    else if (previous !== signature) changed.add(key);
  }
  for (const key of before.keys()) if (!after.has(key)) removed.add(key);
  const isUnchanged = added.size === 0 && removed.size === 0 && changed.size === 0;
  return isUnchanged ? null : { added, removed, changed };
}

/** What changed in the heap between two steps, by object id. `previous` undefined (first step) means no changes. */
export function diffObjects(previous: ObjectTable | undefined, current: ObjectTable): StepDiff {
  if (!previous) return EMPTY_DIFF;
  const newIds = new Set<number>();
  const containers = new Map<number, ContainerDiff>();
  for (const object of Object.values(current)) {
    const before = previous[object.id];
    if (!before) {
      newIds.add(object.id);
      continue;
    }
    const diff = diffCells(containerCells(before), containerCells(object));
    if (diff) containers.set(object.id, diff);
  }
  return { newIds, containers };
}

/** Status of one cell, or null when it is unchanged (or the whole object is new: it animates in as a unit). */
export function cellStatus(diff: StepDiff, objectId: number, cellKey: string): CellStatus | null {
  if (diff.newIds.has(objectId)) return null;
  const container = diff.containers.get(objectId);
  if (!container) return null;
  if (container.added.has(cellKey)) return "added";
  return container.changed.has(cellKey) ? "changed" : null;
}

export function localKey(frameId: number, name: string): string {
  return `${frameId}:${name}`;
}

/**
 * Variables whose value changed or that appeared since the previous step, in frames that already existed.
 * (A fresh frame's locals are all new, so flagging them would only add noise.)
 */
export function diffLocals(previous: TraceStep | undefined, current: TraceStep): Map<string, CellStatus> {
  const flags = new Map<string, CellStatus>();
  if (!previous) return flags;
  const before = new Map(previous.frames.map((frame) => [frame.id, frame]));
  for (const frame of current.frames) {
    const earlier = before.get(frame.id);
    if (!earlier) continue;
    const earlierValues = new Map(earlier.locals.map((local) => [local.name, valueKey(local.value)]));
    for (const local of frame.locals) {
      const previousValue = earlierValues.get(local.name);
      if (previousValue === undefined) flags.set(localKey(frame.id, local.name), "added");
      else if (previousValue !== valueKey(local.value)) flags.set(localKey(frame.id, local.name), "changed");
    }
  }
  return flags;
}

/** Status of a whole object (a list/tree node): new, or any of its fields added/changed. */
export function objectStatus(diff: StepDiff, objectId: number): CellStatus | null {
  if (diff.newIds.has(objectId)) return "added";
  const container = diff.containers.get(objectId);
  return container && (container.added.size > 0 || container.changed.size > 0) ? "changed" : null;
}
