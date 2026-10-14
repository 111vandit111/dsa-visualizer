/*
 * Solution code shares the realm with the harness, so it can replace builtins (Array.prototype.push = null,
 * Array.isArray = ...). Every case starts from, and is cleaned up to, the builtins captured at module load.
 * Restoring only uses references captured here, so it still works while builtins are tampered with.
 */
const { defineProperty, deleteProperty, getOwnPropertyDescriptor, ownKeys } = Reflect;
const { create, getPrototypeOf, is } = Object;

interface GuardTarget {
  target: object;
  /** Only these keys (others are left alone); omitted = every own key, and keys added later are removed. */
  keys?: readonly PropertyKey[];
}

interface GuardedTarget {
  target: object;
  keys: readonly PropertyKey[];
  descriptors: Record<PropertyKey, PropertyDescriptor>;
  isComplete: boolean;
}

export type BuiltinsSnapshot = readonly GuardedTarget[];

const DESCRIPTOR_FIELDS = ["value", "get", "set", "writable", "enumerable", "configurable"] as const;
const GLOBAL_KEYS = [
  "Object", "Array", "Function", "JSON", "Math", "Reflect", "Number", "String", "Boolean", "Symbol", "BigInt", "Map",
  "Set", "WeakMap", "WeakSet", "Promise", "Error", "TypeError", "RangeError", "SyntaxError", "ReferenceError", "Date",
  "RegExp", "ArrayBuffer", "Proxy", "structuredClone", "performance", "parseInt", "parseFloat", "isNaN", "isFinite",
] as const;

/** Null-prototype copy, so a polluted Object.prototype (e.g. a `get` key) cannot change its meaning. */
function detach(descriptor: PropertyDescriptor): PropertyDescriptor {
  const copy = create(null) as Record<string, unknown>;
  for (const field of DESCRIPTOR_FIELDS) if (field in descriptor) copy[field] = descriptor[field];
  return copy as PropertyDescriptor;
}

function hasSameValue(current: PropertyDescriptor, original: PropertyDescriptor): boolean {
  return is(current.value, original.value) && current.get === original.get && current.set === original.set;
}

function isSameDescriptor(current: PropertyDescriptor, original: PropertyDescriptor): boolean {
  return (
    hasSameValue(current, original) &&
    current.writable === original.writable &&
    current.enumerable === original.enumerable &&
    current.configurable === original.configurable
  );
}

/** Keys without a descriptor were absent at capture: restoring deletes them again if they appear. */
export function captureBuiltins(targets: readonly GuardTarget[]): BuiltinsSnapshot {
  return targets.map(({ target, keys }) => {
    const descriptors = create(null) as Record<PropertyKey, PropertyDescriptor>;
    const listed = keys ?? ownKeys(target);
    for (const key of listed) {
      const descriptor = getOwnPropertyDescriptor(target, key);
      if (descriptor) descriptors[key] = detach(descriptor);
    }
    return { target, keys: [...listed], descriptors, isComplete: keys === undefined };
  });
}

/** Puts captured properties back and removes ones added since. Returns keys whose value could not be restored (frozen). */
export function restoreBuiltins(snapshot: BuiltinsSnapshot): PropertyKey[] {
  const failed: PropertyKey[] = [];
  for (let index = 0; index < snapshot.length; index++) {
    const { target, keys, descriptors, isComplete } = snapshot[index];
    const current = isComplete ? ownKeys(target) : [];
    for (let at = 0; at < current.length; at++) {
      const key = current[at];
      if (!(key in descriptors) && !deleteProperty(target, key)) failed[failed.length] = key;
    }
    for (let at = 0; at < keys.length; at++) {
      const key = keys[at];
      const existing = getOwnPropertyDescriptor(target, key);
      if (!(key in descriptors)) {
        if (existing && !deleteProperty(target, key)) failed[failed.length] = key;
        continue;
      }
      const original = descriptors[key];
      if (existing && isSameDescriptor(existing, original)) continue;
      const isRestored = defineProperty(target, key, original) || (existing !== undefined && hasSameValue(existing, original));
      if (!isRestored) failed[failed.length] = key;
    }
  }
  return failed;
}

/** The builtins the harness and the T4 helpers rely on, plus `extraPrototypes` (injected classes shared by cases). */
export function captureHarnessBuiltins(extraPrototypes: readonly object[]): BuiltinsSnapshot {
  const iteratorPrototypes = [[][Symbol.iterator](), new Map().entries(), new Set().values(), ""[Symbol.iterator]()].map(
    (iterator) => getPrototypeOf(iterator) as object,
  );
  const builtins: object[] = [
    Object, Array, Array.prototype, Function.prototype, JSON, Math, Reflect, Number, Number.prototype, String,
    String.prototype, Symbol, Map, Map.prototype, Set, Set.prototype, WeakMap.prototype, WeakSet.prototype,
    Error.prototype, Promise, Promise.prototype, Date, Date.prototype, RegExp.prototype, ArrayBuffer,
    getPrototypeOf(iteratorPrototypes[0]) as object, ...iteratorPrototypes, ...extraPrototypes,
  ];
  // Object.prototype first: once restored, inherited pollution can no longer skew the rest.
  return captureBuiltins([
    { target: Object.prototype },
    { target: globalThis, keys: GLOBAL_KEYS },
    ...builtins.map((target) => ({ target })),
  ]);
}
