import { beginSnapshot, type SerializeContext, type SnapshotWriter } from "./serializer";
import type { ScopeReader } from "./runtime";
import type { SObject, SValue, TraceFrame, TraceStep } from "./types";

export interface LiveFrame {
  id: number;
  name: string;
  line: number;
  read: ScopeReader | null;
  self: unknown;
}

export interface ValueBox {
  value: unknown;
}

const UNREADABLE_LABEL = "(unreadable)";
/** Captured at load and used with index writes / plain loops: solution code may replace builtins mid-case. */
const { assign, values } = Object;

/** Reads one binding. A binding in its temporal dead zone (or `this` before super()) throws: it is omitted, not an error. */
function readSlot(get: () => unknown): ValueBox | null {
  try {
    return { value: get() };
  } catch {
    return null;
  }
}

/**
 * Serializer for one step. Serializing can run user code (Proxy traps): a value whose serialization
 * throws is recorded as opaque instead of failing the case, and the snapshot continues.
 */
export class SafeSnapshot {
  private writer: SnapshotWriter;
  private readonly abandoned: Record<number, SObject>[] = [];

  constructor(private readonly context: SerializeContext) {
    this.writer = beginSnapshot(context);
  }

  serialize(value: unknown): SValue {
    try {
      return this.writer.serialize(value);
    } catch {
      // The failed writer's work queue is unusable: keep the objects it finished, continue with a new writer.
      this.abandoned[this.abandoned.length] = this.writer.objects;
      this.writer = beginSnapshot(this.context);
      return { k: "opaque", label: UNREADABLE_LABEL };
    }
  }

  objects(): Record<number, SObject> {
    if (this.abandoned.length === 0) return this.writer.objects;
    const merged: Record<number, SObject> = {};
    for (let index = 0; index < this.abandoned.length; index++) assign(merged, this.abandoned[index]);
    return assign(merged, this.writer.objects);
  }
}

export function serializeFrame(frame: LiveFrame, snapshot: SafeSnapshot, isDetailed: boolean): TraceFrame {
  const view = frame.read ? frame.read() : null;
  const locals: TraceFrame["locals"] = [];
  const bindings = isDetailed && view ? view.l : [];
  for (let index = 0; index < bindings.length; index++) {
    const binding = bindings[index];
    const slot = readSlot(binding[1]);
    if (slot) locals[locals.length] = { name: binding[0], value: snapshot.serialize(slot.value) };
  }
  const selfSlot = view ? readSlot(view.s) : { value: frame.self };
  const self: SValue = selfSlot ? snapshot.serialize(selfSlot.value) : { k: "undefined" };
  return { id: frame.id, name: frame.name, line: frame.line, locals, self };
}

/** Size of a recorded step in serialized nodes (frames, locals, objects and their slots), for the trace budget. */
export function snapshotCost(step: TraceStep): number {
  let cost = 0;
  for (let index = 0; index < step.frames.length; index++) cost += 1 + step.frames[index].locals.length;
  const objects = values(step.objects);
  for (let index = 0; index < objects.length; index++) {
    const object = objects[index];
    cost += 1 + ("entries" in object ? object.entries.length * 2 : object.items.length);
  }
  return cost;
}
