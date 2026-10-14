/**
 * Capabilities solution code must never reach: network, storage, cross-context messaging and worker
 * control. A same-origin worker could otherwise call the admin API with the visitor's cookies.
 */
export const BLOCKED_GLOBALS = [
  "fetch",
  "fetchLater",
  "XMLHttpRequest",
  "WebSocket",
  "WebSocketStream",
  "WebTransport",
  "EventSource",
  "importScripts",
  "indexedDB",
  "caches",
  "cookieStore",
  "navigator",
  "postMessage",
  "close",
  "Worker",
  "SharedWorker",
  "BroadcastChannel",
] as const;

/** Also hidden from solution code (undefined), but left intact on the worker global the tracer itself uses. */
const EVENT_GLOBALS = ["addEventListener", "removeEventListener", "dispatchEvent", "onmessage", "onerror"] as const;

/** Names that resolve to the safe global object instead of the real one. */
const GLOBAL_OBJECT_NAMES = ["self", "globalThis"] as const;

/** Standard builtins the safe `self`/`globalThis` object exposes. */
const SAFE_BUILTINS = [
  "Object", "Array", "Map", "Set", "WeakMap", "WeakSet", "Math", "JSON", "Number", "String", "Boolean", "Symbol",
  "BigInt", "Date", "RegExp", "Error", "TypeError", "RangeError", "SyntaxError", "ReferenceError", "Promise",
  "Reflect", "Infinity", "NaN", "undefined", "parseInt", "parseFloat", "isNaN", "isFinite", "structuredClone",
  "console", "Int8Array", "Uint8Array", "Int16Array", "Uint16Array", "Int32Array", "Uint32Array", "Float32Array",
  "Float64Array", "BigInt64Array", "BigUint64Array",
] as const;

/** Parameters shadowing dangerous globals for solution code; `extras` (PriorityQueue, ...) also live on the safe global. */
export function sandboxParameters(extras: Readonly<Record<string, unknown>>): [string, unknown][] {
  const real = globalThis as unknown as Record<string, unknown>;
  const safeGlobal = Object.freeze({ ...Object.fromEntries(SAFE_BUILTINS.map((name) => [name, real[name]])), ...extras });
  return [
    ...Object.entries(extras),
    ...[...BLOCKED_GLOBALS, ...EVENT_GLOBALS].map((name): [string, unknown] => [name, undefined]),
    ...GLOBAL_OBJECT_NAMES.map((name): [string, unknown] => [name, safeGlobal]),
  ];
}

/**
 * Replaces the blocked capabilities on the real worker global (call once, before any solution code runs),
 * so escapes like `Function("return this")().fetch` find nothing either.
 */
export function lockDownGlobals(target: object): string[] {
  const unlocked: string[] = [];
  for (const name of BLOCKED_GLOBALS) {
    try {
      Object.defineProperty(target, name, { value: undefined, writable: false, configurable: false, enumerable: false });
    } catch {
      // A non-configurable own property cannot be replaced: report it (parameter shadowing still hides the name).
      unlocked.push(name);
    }
  }
  return unlocked;
}
