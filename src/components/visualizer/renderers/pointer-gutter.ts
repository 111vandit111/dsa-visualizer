import type { CSSProperties } from "react";
import { VIZ_LIMITS } from "@/lib/viz/constants";

/** One name chip (14px line) plus the gap between stacked chips. */
const CHIP_ROW_PX = 16;
/** The caret under the nearest chip plus its margin to the cell. */
const CARET_PX = 6;

/** Height of the chip stack `PointerMarks` draws for `count` pointers on one cell: up to `maxPointerTags` chips, then a "+n" chip. */
export function markStackPx(count: number): number {
  if (count <= 0) return 0;
  const rows = Math.min(count, VIZ_LIMITS.maxPointerTags) + (count > VIZ_LIMITS.maxPointerTags ? 1 : 0);
  return rows * CHIP_ROW_PX + CARET_PX;
}

/** Room for the busiest cell's chip stack, above (`top`) or below (`bottom`) the cells; no style when nothing points here. */
export function gutterStyle(maxPerCell: number, side: "top" | "bottom"): CSSProperties | undefined {
  const px = markStackPx(maxPerCell);
  if (px === 0) return undefined;
  return side === "top" ? { paddingTop: px } : { paddingBottom: px };
}
