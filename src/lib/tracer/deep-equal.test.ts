import { describe, expect, it } from "vitest";
import { deepEqual } from "./deep-equal";

describe("deepEqual", () => {
  it("treats undefined and null as equal", () => {
    expect(deepEqual(undefined, null)).toBe(true);
    expect(deepEqual(null, 0)).toBe(false);
  });

  it("handles zero, NaN and infinities", () => {
    expect(deepEqual(0, -0)).toBe(true);
    expect(deepEqual(NaN, NaN)).toBe(true);
    expect(deepEqual(Infinity, Infinity)).toBe(true);
    expect(deepEqual(Infinity, -Infinity)).toBe(false);
  });

  it("allows float tolerance but compares integers strictly", () => {
    expect(deepEqual(0.1 + 0.2, 0.3)).toBe(true);
    expect(deepEqual(1.000001, 1.000002)).toBe(true);
    expect(deepEqual(1.0001, 1.0002)).toBe(false);
    expect(deepEqual(5, 6)).toBe(false);
    expect(deepEqual(1_000_000, 1_000_001)).toBe(false);
    expect(deepEqual(1, 1.5, { floatTolerance: 1 })).toBe(true);
  });

  it("compares nested arrays and order-sensitive arrays", () => {
    expect(deepEqual([[1, 2], [3]], [[1, 2], [3]])).toBe(true);
    expect(deepEqual([6, 5], [5, 6])).toBe(false);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(deepEqual([], [])).toBe(true);
  });

  it("ignores key order and keys with undefined", () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(deepEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false);
  });

  it("compares Set and Map structurally", () => {
    expect(deepEqual(new Set([1, 2]), new Set([2, 1]))).toBe(true);
    expect(deepEqual(new Set([1, 2]), new Set([1, 3]))).toBe(false);
    expect(deepEqual(new Set([[1], [2]]), new Set([[2], [1]]))).toBe(true);
    expect(deepEqual(new Map([["a", [1]]]), new Map([["a", [1]]]))).toBe(true);
    expect(deepEqual(new Map([["a", 1]]), new Map([["a", 2]]))).toBe(false);
  });

  it("rejects type mismatches", () => {
    expect(deepEqual([1], { 0: 1 })).toBe(false);
    expect(deepEqual("1", 1)).toBe(false);
    expect(deepEqual([1], new Set([1]))).toBe(false);
  });

  it("is cycle-safe", () => {
    const a: { self?: unknown } = {};
    a.self = a;
    const b: { self?: unknown } = {};
    b.self = b;
    expect(deepEqual(a, b)).toBe(true);
  });

  it("survives very deep nesting without overflowing", () => {
    let a: unknown = 1;
    let b: unknown = 1;
    for (let i = 0; i < 100_000; i++) {
      a = [a];
      b = [b];
    }
    expect(deepEqual(a, b)).toBe(true);
  });
});
