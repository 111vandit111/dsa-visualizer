import { SERIALIZE_LIMITS } from "./constants";
import { PriorityQueue } from "./priority-queue";
import type { SObject, SPrimitive, SRef, SValue } from "./types";

export type SerializeLimits = { -readonly [K in keyof typeof SERIALIZE_LIMITS]: number };

export interface SerializeContext {
  registry: WeakMap<object, number>;
  nextId: number;
  limits: SerializeLimits;
}

export interface SnapshotWriter {
  serialize(value: unknown): SValue;
  objects: Record<number, SObject>;
}

interface PendingObject {
  id: number;
  value: object;
}

const OVERFLOW_LABEL = "…";

export function createSerializeContext(limits: Partial<SerializeLimits> = {}): SerializeContext {
  return { registry: new WeakMap(), nextId: 1, limits: { ...SERIALIZE_LIMITS, ...limits } };
}

export function beginSnapshot(ctx: SerializeContext): SnapshotWriter {
  const builder = new SnapshotBuilder(ctx);
  return { serialize: (value) => builder.serialize(value), objects: builder.objects };
}

function cutString(text: string, maxLength: number): string {
  return text.length > maxLength ? text.slice(0, maxLength) + OVERFLOW_LABEL : text;
}

function readDataProperty(target: object, key: string | symbol): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(target, key);
  return descriptor && "value" in descriptor ? descriptor.value : undefined;
}

function functionName(fn: object): string {
  const name = readDataProperty(fn, "name");
  return typeof name === "string" ? name : "";
}

function classNameOf(value: object): string {
  try {
    const proto = Object.getPrototypeOf(value) as object | null;
    const ctor = proto ? readDataProperty(proto, "constructor") : undefined;
    const name = typeof ctor === "function" ? functionName(ctor) : "";
    return name || "Object";
  } catch {
    return "Object";
  }
}

function isTypedArray(value: object): value is ArrayLike<unknown> {
  return ArrayBuffer.isView(value) && !(value instanceof DataView);
}

function opaqueLabel(value: object): string | null {
  if (value instanceof Date) {
    const time = Date.prototype.getTime.call(value) as number;
    return Number.isNaN(time) ? "Invalid Date" : Date.prototype.toISOString.call(value);
  }
  if (value instanceof RegExp) return RegExp.prototype.toString.call(value);
  return null;
}

class SnapshotBuilder {
  readonly objects: Record<number, SObject> = {};
  private count = 0;
  private readonly queue: PendingObject[] = [];
  private readonly limits: SerializeLimits;

  constructor(private readonly ctx: SerializeContext) {
    this.limits = ctx.limits;
  }

  serialize(value: unknown): SValue {
    const result = this.toValue(value);
    this.drain();
    return result;
  }

  private drain(): void {
    for (let i = 0; i < this.queue.length; i++) {
      const { id, value } = this.queue[i];
      this.objects[id] = this.build(id, value);
    }
    this.queue.length = 0;
  }

  private toValue(value: unknown): SValue {
    switch (typeof value) {
      case "undefined":
        return { k: "undefined" };
      case "boolean":
        return { k: "boolean", v: value };
      case "number":
        return { k: "number", v: value };
      case "bigint":
        return { k: "bigint", v: value.toString() };
      case "string":
        return { k: "string", v: cutString(value, this.limits.maxStringLength) };
      case "symbol":
        return { k: "symbol", v: cutString(value.toString(), this.limits.maxStringLength) };
      case "function":
        return { k: "function", name: functionName(value) };
      default:
        return value === null ? { k: "null" } : this.toObjectValue(value as object);
    }
  }

  private toObjectValue(value: object): SPrimitive | SRef {
    const label = opaqueLabel(value);
    if (label !== null) return { k: "opaque", label };
    const knownId = this.ctx.registry.get(value);
    if (knownId !== undefined && knownId in this.objects) return { k: "ref", id: knownId };
    if (this.count >= this.limits.maxObjects) return { k: "opaque", label: OVERFLOW_LABEL };
    const id = knownId ?? this.ctx.nextId++;
    this.ctx.registry.set(value, id);
    this.count++;
    this.objects[id] = { k: "object", id, className: "Object", entries: [], size: 0 };
    this.queue.push({ id, value });
    return { k: "ref", id };
  }

  private takeItems(source: Iterable<unknown>): SValue[] {
    const items: SValue[] = [];
    for (const item of source) {
      if (items.length >= this.limits.maxItemsPerContainer) break;
      items.push(this.toValue(item));
    }
    return items;
  }

  private build(id: number, value: object): SObject {
    if (value instanceof PriorityQueue) {
      return { k: "heap", id, items: this.takeItems(value.heapItems()), size: value.size() };
    }
    if (Array.isArray(value) || isTypedArray(value)) return this.buildArray(id, value);
    if (value instanceof Set) {
      return { k: "set", id, items: this.takeItems(Set.prototype.values.call(value)), size: value.size };
    }
    if (value instanceof Map) return this.buildMap(id, value);
    return this.buildObject(id, value);
  }

  private buildArray(id: number, value: ArrayLike<unknown>): SObject {
    const items: SValue[] = [];
    const shown = Math.min(value.length, this.limits.maxItemsPerContainer);
    for (let i = 0; i < shown; i++) items.push(this.toValue(value[i]));
    return { k: "array", id, items, length: value.length };
  }

  private buildMap(id: number, value: Map<unknown, unknown>): SObject {
    const entries: [SValue, SValue][] = [];
    for (const [key, entry] of Map.prototype.entries.call(value) as Iterable<[unknown, unknown]>) {
      if (entries.length >= this.limits.maxItemsPerContainer) break;
      entries.push([this.toValue(key), this.toValue(entry)]);
    }
    return { k: "map", id, entries, size: value.size };
  }

  private buildObject(id: number, value: object): SObject {
    const keys = Object.keys(value);
    const entries: [string, SValue][] = [];
    for (const key of keys) {
      if (entries.length >= this.limits.maxItemsPerContainer) break;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && "value" in descriptor) entries.push([key, this.toValue(descriptor.value)]);
    }
    return { k: "object", id, className: classNameOf(value), entries, size: keys.length };
  }
}
