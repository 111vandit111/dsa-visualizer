import type { SObject } from "@/lib/tracer/types";

export interface BarGeometry {
  /** Height of the bar as a fraction (0..1) of the chart height. */
  fraction: number;
  isNegative: boolean;
}

export interface BarsLayout {
  bars: BarGeometry[];
  /** Height of the zero line above the chart bottom, as a fraction (0..1) of the chart height (0 unless a value is negative). */
  baselineFraction: number;
  /** Largest and smallest value of the list (non-finite counted as 0; 0 for an empty list). */
  max: number;
  min: number;
}

/** True when the array can be drawn as a bar chart: at least one item and every item a finite number. */
export function isBarsCompatible(object: SObject): boolean {
  return object.k === "array" && object.items.length >= 1 && object.items.every((item) => item.k === "number" && Number.isFinite(item.v));
}

const finiteOrZero = (value: number): number => (Number.isFinite(value) ? value : 0);

/**
 * Bar heights for a list of numbers. Positive-only data scales to its maximum; with negatives the chart spans
 * [min, max] around a zero baseline. Non-finite values count as 0. Values are normalised by the largest magnitude
 * first, so huge numbers cannot overflow the arithmetic.
 */
export function computeBars(values: readonly number[]): BarsLayout {
  const safe = values.map(finiteOrZero);
  let min = 0;
  let max = 0;
  let lowest = safe.length > 0 ? safe[0] : 0;
  let highest = lowest;
  for (const value of safe) {
    if (value < min) min = value;
    if (value > max) max = value;
    if (value < lowest) lowest = value;
    if (value > highest) highest = value;
  }
  const scale = Math.max(Math.abs(min), Math.abs(max));
  if (scale === 0) {
    return { bars: safe.map(() => ({ fraction: 0, isNegative: false })), baselineFraction: 0, max: highest, min: lowest };
  }
  const low = min / scale;
  const high = max / scale;
  const span = high - low;
  return {
    bars: safe.map((value) => ({ fraction: Math.abs(value / scale) / span, isNegative: value < 0 })),
    baselineFraction: 0 - low / span,
    max: highest,
    min: lowest,
  };
}
