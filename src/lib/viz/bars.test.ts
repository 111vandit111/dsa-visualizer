import { describe, expect, it } from "vitest";
import { arr, map, num, str, nul } from "./test-helpers";
import { computeBars, isBarsCompatible } from "./bars";

describe("isBarsCompatible", () => {
  it("accepts arrays of finite numbers only", () => {
    expect(isBarsCompatible(arr(1, [num(3), num(0), num(-2.5)]))).toBe(true);
    expect(isBarsCompatible(arr(1, []))).toBe(false);
    expect(isBarsCompatible(arr(1, [num(1), str("a")]))).toBe(false);
    expect(isBarsCompatible(arr(1, [num(1), nul]))).toBe(false);
    expect(isBarsCompatible(arr(1, [num(1), num(Number.NaN)]))).toBe(false);
    expect(isBarsCompatible(arr(1, [num(Number.POSITIVE_INFINITY)]))).toBe(false);
    expect(isBarsCompatible(map(1, []))).toBe(false);
  });
});

describe("computeBars", () => {
  it("scales positive values to the maximum with the baseline at the bottom", () => {
    const layout = computeBars([1, 4, 2]);
    expect(layout.bars.map((bar) => bar.fraction)).toEqual([0.25, 1, 0.5]);
    expect(layout.baselineFraction).toBe(0);
    expect(layout.max).toBe(4);
    expect(layout.min).toBe(1);
    expect(layout.bars.every((bar) => !bar.isNegative)).toBe(true);
  });

  it("puts a zero baseline inside the chart when values are negative", () => {
    const layout = computeBars([2, -2, 0]);
    expect(layout.baselineFraction).toBeCloseTo(0.5);
    expect(layout.bars.map((bar) => bar.fraction)).toEqual([0.5, 0.5, 0]);
    expect(layout.bars.map((bar) => bar.isNegative)).toEqual([false, true, false]);
    const allNegative = computeBars([-1, -4]);
    expect(allNegative.baselineFraction).toBe(1);
    expect(allNegative.bars.map((bar) => bar.fraction)).toEqual([0.25, 1]);
  });

  it("handles all-equal, all-zero, empty and non-finite input", () => {
    expect(computeBars([5, 5, 5]).bars.map((bar) => bar.fraction)).toEqual([1, 1, 1]);
    const zeros = computeBars([0, 0]);
    expect(zeros.bars.map((bar) => bar.fraction)).toEqual([0, 0]);
    expect(zeros.baselineFraction).toBe(0);
    expect(computeBars([])).toEqual({ bars: [], baselineFraction: 0, max: 0, min: 0 });
    const odd = computeBars([Number.NaN, Number.POSITIVE_INFINITY, 2]);
    expect(odd.bars.map((bar) => bar.fraction)).toEqual([0, 0, 1]);
  });

  it("does not overflow on huge magnitudes", () => {
    const layout = computeBars([Number.MAX_VALUE, -Number.MAX_VALUE]);
    expect(layout.baselineFraction).toBeCloseTo(0.5);
    expect(layout.bars.map((bar) => bar.fraction)).toEqual([0.5, 0.5]);
    for (const bar of computeBars([1e308, 1e-300]).bars) expect(Number.isFinite(bar.fraction)).toBe(true);
  });
});
