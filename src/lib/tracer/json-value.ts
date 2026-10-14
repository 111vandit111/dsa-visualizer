import { JSON_VALUE_LIMITS } from "./constants";
import { PriorityQueue } from "./priority-queue";
import type { JsonValue } from "./types";

const TOTAL_NODE_BUDGET = 20_000;
const CIRCULAR_MARKER = "[Circular]";
const TRUNCATED_MARKER = "[…]";

interface Walk {
  ancestors: Set<object>;
  budget: number;
}

export function toJsonValue(value: unknown): JsonValue {
  return convert(value, 0, { ancestors: new Set(), budget: TOTAL_NODE_BUDGET });
}

function readDataProperty(target: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(target, key);
  return descriptor && "value" in descriptor ? descriptor.value : undefined;
}

function convertPrimitive(value: unknown): JsonValue | undefined {
  switch (typeof value) {
    case "undefined":
      return null;
    case "boolean":
    case "number":
    case "string":
      return value;
    case "bigint":
      return value.toString();
    case "symbol":
      return value.toString();
    case "function": {
      const name = readDataProperty(value, "name");
      return `[Function${typeof name === "string" && name ? ` ${name}` : ""}]`;
    }
    default:
      return value === null ? null : undefined;
  }
}

function convert(value: unknown, depth: number, walk: Walk): JsonValue {
  const primitive = convertPrimitive(value);
  if (primitive !== undefined) return primitive;
  const target = value as object;
  if (target instanceof Date) {
    const time = Date.prototype.getTime.call(target) as number;
    return Number.isNaN(time) ? "Invalid Date" : Date.prototype.toISOString.call(target);
  }
  if (target instanceof RegExp) return RegExp.prototype.toString.call(target);
  if (walk.ancestors.has(target)) return CIRCULAR_MARKER;
  if (depth >= JSON_VALUE_LIMITS.maxDepth || walk.budget <= 0) return TRUNCATED_MARKER;
  walk.ancestors.add(target);
  try {
    return convertContainer(target, depth, walk);
  } finally {
    walk.ancestors.delete(target);
  }
}

function convertItems(items: Iterable<unknown>, size: number, depth: number, walk: Walk): JsonValue[] {
  const out: JsonValue[] = [];
  for (const item of items) {
    if (out.length >= JSON_VALUE_LIMITS.maxItems) break;
    walk.budget--;
    out.push(convert(item, depth + 1, walk));
  }
  if (size > out.length) out.push(`[… ${size - out.length} more]`);
  return out;
}

function mapKey(key: unknown): string {
  const converted = convertPrimitive(key);
  return typeof converted === "string" ? converted : String(converted ?? "[object]");
}

function convertEntries(entries: Iterable<[string, unknown]>, depth: number, walk: Walk): JsonValue {
  const out: { [key: string]: JsonValue } = {};
  let count = 0;
  for (const [key, item] of entries) {
    if (count++ >= JSON_VALUE_LIMITS.maxItems) break;
    walk.budget--;
    // defineProperty so a "__proto__" key becomes an own property instead of setting the prototype.
    Object.defineProperty(out, key, {
      value: convert(item, depth + 1, walk),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return out;
}

function ownDataEntries(target: object): [string, unknown][] {
  const entries: [string, unknown][] = [];
  for (const key of Object.keys(target)) {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (descriptor && "value" in descriptor) entries.push([key, descriptor.value]);
  }
  return entries;
}

function convertContainer(target: object, depth: number, walk: Walk): JsonValue {
  if (Array.isArray(target)) return convertItems(target, target.length, depth, walk);
  if (target instanceof PriorityQueue) return convertItems(target.toArray(), target.size(), depth, walk);
  if (target instanceof Set) return convertItems(Set.prototype.values.call(target), target.size, depth, walk);
  if (target instanceof Map) {
    const pairs = Array.from(Map.prototype.entries.call(target) as Iterable<[unknown, unknown]>);
    return convertEntries(pairs.map(([key, item]) => [mapKey(key), item]), depth, walk);
  }
  if (ArrayBuffer.isView(target) && !(target instanceof DataView)) {
    const typed = target as unknown as ArrayLike<unknown>;
    const head = Array.prototype.slice.call(typed, 0, JSON_VALUE_LIMITS.maxItems) as unknown[];
    return convertItems(head, typed.length, depth, walk);
  }
  return convertEntries(ownDataEntries(target), depth, walk);
}
