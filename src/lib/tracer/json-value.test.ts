import { describe, expect, it } from "vitest";
import { toJsonValue } from "./json-value";

describe("toJsonValue", () => {
  it("maps undefined to null and keeps JSON primitives", () => {
    expect(toJsonValue(undefined)).toBeNull();
    expect(toJsonValue(null)).toBeNull();
    expect(toJsonValue([1, "a", true, undefined])).toEqual([1, "a", true, null]);
  });

  it("converts Set to array, Map to object, class instance to plain object", () => {
    class Point {
      x = 1;
      y = 2;
    }
    expect(toJsonValue(new Set([1, 2]))).toEqual([1, 2]);
    expect(toJsonValue(new Map([["a", 1]]))).toEqual({ a: 1 });
    expect(toJsonValue(new Point())).toEqual({ x: 1, y: 2 });
  });

  it("describes functions, bigint and dates", () => {
    function named() {}
    expect(toJsonValue(named)).toBe("[Function named]");
    expect(toJsonValue(BigInt(5))).toBe("5");
    expect(toJsonValue(new Date(0))).toBe("1970-01-01T00:00:00.000Z");
  });

  it("marks cycles but allows shared non-cyclic references", () => {
    const node: { self?: unknown } = {};
    node.self = node;
    expect(toJsonValue(node)).toEqual({ self: "[Circular]" });
    const shared = { n: 1 };
    expect(toJsonValue([shared, shared])).toEqual([{ n: 1 }, { n: 1 }]);
  });

  it("caps depth and item count", () => {
    let deep: unknown = "leaf";
    for (let i = 0; i < 30; i++) deep = [deep];
    expect(JSON.stringify(toJsonValue(deep))).toContain("[…]");
    const big = toJsonValue(Array.from({ length: 800 }, (_, i) => i)) as unknown[];
    expect(big).toHaveLength(501);
    expect(big[500]).toBe("[… 300 more]");
  });

  it("keeps a __proto__ key as plain data", () => {
    const value = JSON.parse('{"__proto__": {"polluted": 1}, "ok": 2}') as unknown;
    const result = toJsonValue(value) as Record<string, unknown>;
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.keys(result)).toEqual(["__proto__", "ok"]);
    expect(Object.getOwnPropertyDescriptor(result, "__proto__")?.value).toEqual({ polluted: 1 });
  });

  it("does not run getters", () => {
    const value = {
      get boom(): number {
        throw new Error("boom");
      },
      ok: 1,
    };
    expect(toJsonValue(value)).toEqual({ ok: 1 });
  });
});
