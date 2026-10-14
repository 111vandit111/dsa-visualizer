import { FLOAT_TOLERANCE } from "./constants";

export interface DeepEqualOptions {
  floatTolerance?: number;
}

type Pair = [unknown, unknown];
type Visited = WeakMap<object, WeakSet<object>>;

interface Context {
  tolerance: number;
  visited: Visited;
  depth: number;
}

const MAX_NESTED_COLLECTION_DEPTH = 32;

export function deepEqual(actual: unknown, expected: unknown, options: DeepEqualOptions = {}): boolean {
  const tolerance = options.floatTolerance ?? FLOAT_TOLERANCE;
  return equalWith(actual, expected, { tolerance, visited: new WeakMap(), depth: 0 });
}

function equalWith(a: unknown, b: unknown, ctx: Context): boolean {
  const stack: Pair[] = [[a, b]];
  while (stack.length > 0) {
    const [x, y] = stack.pop() as Pair;
    if (!compareNode(x, y, ctx, stack)) return false;
  }
  return true;
}

// Set/Map matching tries candidates, so each attempt gets its own visited table.
function nestedContext(ctx: Context): Context {
  return { tolerance: ctx.tolerance, visited: new WeakMap(), depth: ctx.depth + 1 };
}

function numbersEqual(x: number, y: number, tolerance: number): boolean {
  if (x === y || (Number.isNaN(x) && Number.isNaN(y))) return true;
  if (Number.isInteger(x) && Number.isInteger(y)) return false;
  return Math.abs(x - y) <= tolerance;
}

function hasSeen(x: object, y: object, visited: Visited): boolean {
  let partners = visited.get(x);
  if (!partners) {
    partners = new WeakSet();
    visited.set(x, partners);
  }
  if (partners.has(y)) return true;
  partners.add(y);
  return false;
}

function compareNode(x: unknown, y: unknown, ctx: Context, stack: Pair[]): boolean {
  if (x === undefined || x === null || y === undefined || y === null) {
    return (x === undefined || x === null) && (y === undefined || y === null);
  }
  if (typeof x === "number" && typeof y === "number") return numbersEqual(x, y, ctx.tolerance);
  if (typeof x !== "object" || typeof y !== "object") return typeof x === typeof y && x === y;
  if (x === y || hasSeen(x, y, ctx.visited)) return true;
  return compareObjects(x, y, ctx, stack);
}

function compareObjects(x: object, y: object, ctx: Context, stack: Pair[]): boolean {
  if (Array.isArray(x) || Array.isArray(y)) return compareArrays(x, y, stack);
  if (x instanceof Date || y instanceof Date) {
    return x instanceof Date && y instanceof Date && Object.is(x.getTime(), y.getTime());
  }
  if (x instanceof Set || y instanceof Set) return compareSets(x, y, ctx);
  if (x instanceof Map || y instanceof Map) return compareMaps(x, y, ctx);
  return comparePlainObjects(x, y, stack);
}

function compareArrays(x: object, y: object, stack: Pair[]): boolean {
  if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length) return false;
  for (let i = 0; i < x.length; i++) stack.push([x[i], y[i]]);
  return true;
}

function definedKeys(value: object): string[] {
  return Object.keys(value).filter((key) => (value as Record<string, unknown>)[key] !== undefined);
}

function comparePlainObjects(x: object, y: object, stack: Pair[]): boolean {
  const xKeys = definedKeys(x);
  const yKeys = definedKeys(y);
  if (xKeys.length !== yKeys.length) return false;
  const xRecord = x as Record<string, unknown>;
  const yRecord = y as Record<string, unknown>;
  for (const key of xKeys) {
    if (!Object.prototype.hasOwnProperty.call(yRecord, key) || yRecord[key] === undefined) return false;
    stack.push([xRecord[key], yRecord[key]]);
  }
  return true;
}

function compareSets(x: object, y: object, ctx: Context): boolean {
  if (!(x instanceof Set) || !(y instanceof Set) || x.size !== y.size) return false;
  if (ctx.depth >= MAX_NESTED_COLLECTION_DEPTH) return false;
  const remaining = Array.from(y);
  for (const item of x) {
    const index = remaining.findIndex((candidate) => equalWith(item, candidate, nestedContext(ctx)));
    if (index < 0) return false;
    remaining.splice(index, 1);
  }
  return true;
}

function compareMaps(x: object, y: object, ctx: Context): boolean {
  if (!(x instanceof Map) || !(y instanceof Map) || x.size !== y.size) return false;
  if (ctx.depth >= MAX_NESTED_COLLECTION_DEPTH) return false;
  const remaining = Array.from(y);
  for (const [key, value] of x) {
    const index = remaining.findIndex(
      ([otherKey, otherValue]) =>
        equalWith(key, otherKey, nestedContext(ctx)) && equalWith(value, otherValue, nestedContext(ctx)),
    );
    if (index < 0) return false;
    remaining.splice(index, 1);
  }
  return true;
}
