import type { CSSProperties } from "react";
import { VIZ_LIMITS } from "@/lib/viz/constants";
import { POINTER_PALETTE_SIZE, type Pointer } from "@/lib/viz/overlay-types";

/** Width of one ring and the gap (page background) between two concentric rings, in px. */
const RING_PX = 2;
const RING_GAP_PX = 1;
const GLOW_BLUR_PX = 14;
const GLOW_SPREAD_PX = -2;
const GLOW_PERCENT = 55;
/** Rings of pointers from a caller frame fade like their name chips do. */
const DIM_PERCENT = 55;
const NO_STYLE: CSSProperties = {};

/** The CSS colour of a pointer slot: `--ptr-1` .. `--ptr-8`, wrapping around. */
export function pointerColor(slot: number): string {
  const index = ((slot % POINTER_PALETTE_SIZE) + POINTER_PALETTE_SIZE) % POINTER_PALETTE_SIZE;
  return `var(--ptr-${index + 1})`;
}

/** Sets `--ptr` for the `ptr-*` utilities on the element that carries it. */
export function pointerStyle(slot: number): CSSProperties {
  return { "--ptr": pointerColor(slot) } as CSSProperties;
}

function ringColor(pointer: Pointer): string {
  const color = pointerColor(pointer.slot);
  return pointer.isActive ? color : `color-mix(in oklch, ${color} ${DIM_PERCENT}%, transparent)`;
}

/** Concentric rings for the pointers on one cell (the first `maxPointerTags`), plus a soft glow of the first. */
export function pointerRing(pointers: readonly Pointer[]): CSSProperties {
  const rings = pointers.slice(0, VIZ_LIMITS.maxPointerTags);
  if (rings.length === 0) return NO_STYLE;
  const layers = rings.flatMap((pointer, index) => {
    const inner = index * (RING_PX + RING_GAP_PX);
    const band = `0 0 0 ${inner + RING_PX}px ${ringColor(pointer)}`;
    return index < rings.length - 1 ? [band, `0 0 0 ${inner + RING_PX + RING_GAP_PX}px var(--background)`] : [band];
  });
  const glow = `0 0 ${GLOW_BLUR_PX}px ${GLOW_SPREAD_PX}px color-mix(in oklch, ${ringColor(rings[0])} ${GLOW_PERCENT}%, transparent)`;
  return { boxShadow: [...layers, glow].join(", ") };
}
