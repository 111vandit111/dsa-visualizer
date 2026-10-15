"use client";

import { memo } from "react";
import { motion, type Transition } from "framer-motion";
import { cn } from "@/lib/utils";
import { POINTER_PALETTE_SIZE, type Pointer } from "@/lib/viz/overlay-types";
import type { CellStatus } from "@/lib/viz/types";
import { MAX_RINGS, NODE_RADIUS, outerRadius, RING_WIDTH, ringRadius } from "./graph-geometry";
import { PointerMarks } from "./pointer-marks";
import { pointerRing, pointerStyle } from "./pointer-styles";
import { HALO_FADE_S } from "./tones";

/*
 * The pieces of the graph canvas. Each takes only strings, numbers and stable references, and is memoised: a step
 * redraws just the nodes and edges whose own data changed (paths, pointers, halos), not all of them.
 */

export const INSTANT: Transition = { duration: 0 };
const HALO_TRANSITION: Transition = { duration: HALO_FADE_S, ease: "easeOut" };

const BASE_STROKE = 1.5;
const PATH_STROKE = 3;
const HALO_STROKE = 6;
const HALO_PAD = 2;
const GLOW_BLUR = 2.5;
const REACHED_FILL_OPACITY = 0.22;
const ARROW_SIZE = 8;
const ARROW_PATH = "M0 0.5 L8 4 L0 7.5 z";
const HALO_CLASS: Record<CellStatus, string> = { added: "stroke-primary", changed: "stroke-viz-amber" };
const HALO_EDGE_OPACITY = 0.8;
const HALO_NODE_OPACITY = 0.9;

export const paletteIndex = (slot: number): number => ((slot % POINTER_PALETTE_SIZE) + POINTER_PALETTE_SIZE) % POINTER_PALETTE_SIZE;

/** Shrinks and cuts a label so it stays inside the circle. */
function fitLabel(label: string): { text: string; size: number } {
  if (label.length <= 3) return { text: label, size: 11 };
  if (label.length <= 5) return { text: label, size: 9 };
  return { text: `${label.slice(0, 6)}…`, size: 7.5 };
}

// ------------------------------------------------------------------- edges

/** Glow filter and arrowheads (one grey, one per palette colour in use); `slotList` is "0,3". */
export const Markers = memo(function Markers({ id, slotList }: { id: string; slotList: string }) {
  const slots = slotList === "" ? [] : slotList.split(",").map(Number);
  const size = { markerWidth: ARROW_SIZE, markerHeight: ARROW_SIZE, markerUnits: "userSpaceOnUse", refX: ARROW_SIZE - 0.5, refY: ARROW_SIZE / 2, orient: "auto" } as const;
  return (
    <defs>
      <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation={GLOW_BLUR} result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <marker id={`${id}-arrow`} {...size}>
        <path d={ARROW_PATH} className="fill-muted-foreground/70" />
      </marker>
      {slots.map((slot) => (
        <marker key={slot} id={`${id}-arrow-${paletteIndex(slot)}`} style={pointerStyle(slot)} {...size}>
          <path d={ARROW_PATH} className="ptr-fill" />
        </marker>
      ))}
    </defs>
  );
});

interface EdgeLineProps {
  edgeKey: string;
  d: string;
  title: string;
  /** "0,2": the slots of the paths that walk this edge. */
  slots: string | undefined;
  isReached: boolean;
  markerEnd: string | undefined;
  transition: Transition;
}

export const EdgeLine = memo(function EdgeLine({ edgeKey, d, title, slots, isReached, markerEnd, transition }: EdgeLineProps) {
  return (
    <motion.path
      data-testid={`graph-edge-${edgeKey}`}
      data-path-slots={slots}
      data-reached={isReached ? "true" : undefined}
      fill="none"
      strokeWidth={BASE_STROKE}
      strokeLinecap="round"
      className="stroke-muted-foreground/45"
      markerEnd={markerEnd}
      d={d}
      initial={{ opacity: 0, d }}
      animate={{ opacity: 1, d }}
      transition={transition}
    >
      <title>{title}</title>
    </motion.path>
  );
});

interface PathStrokeProps {
  edgeKey: string;
  slot: number;
  isActive: boolean;
  d: string;
  markerEnd: string | undefined;
  transition: Transition;
}

/** One path's thick coloured stroke along an edge. */
export const PathStroke = memo(function PathStroke({ edgeKey, slot, isActive, d, markerEnd, transition }: PathStrokeProps) {
  return (
    <motion.path
      data-testid={`graph-stroke-${edgeKey}-${slot}`}
      fill="none"
      strokeWidth={PATH_STROKE}
      strokeLinecap="round"
      className={cn("ptr-stroke", !isActive && "ptr-dim")}
      style={pointerStyle(slot)}
      markerEnd={markerEnd}
      d={d}
      initial={{ opacity: 0, d }}
      animate={{ opacity: 1, d }}
      exit={{ opacity: 0 }}
      transition={transition}
    />
  );
});

/** Flash on an edge that a step added or changed; mount it with a key that includes the step to replay the fade. */
export const EdgeHalo = memo(function EdgeHalo({ d, status, isReduced }: { d: string; status: CellStatus; isReduced: boolean }) {
  return (
    <motion.path
      data-halo={status}
      aria-hidden="true"
      fill="none"
      strokeWidth={HALO_STROKE}
      strokeLinecap="round"
      className={HALO_CLASS[status]}
      d={d}
      initial={{ opacity: HALO_EDGE_OPACITY }}
      animate={{ opacity: isReduced ? HALO_EDGE_OPACITY : 0 }}
      transition={HALO_TRANSITION}
    />
  );
});

interface WeightLabelProps {
  edgeKey: string;
  text: string;
  x: number;
  y: number;
  transition: Transition;
}

export const WeightLabel = memo(function WeightLabel({ edgeKey, text, x, y, transition }: WeightLabelProps) {
  return (
    <motion.g data-testid={`graph-weight-${edgeKey}`} initial={false} animate={{ x, y }} transition={transition}>
      <text textAnchor="middle" dominantBaseline="central" fontSize={9} className="fill-muted-foreground font-mono" style={{ paintOrder: "stroke", stroke: "var(--background)", strokeWidth: 3 }}>
        {text}
      </text>
    </motion.g>
  );
});

// ------------------------------------------------------------------- nodes

interface NodeShapeProps {
  nodeKey: string;
  label: string;
  title: string;
  x: number;
  y: number;
  /** "0,2": the slots of every path through the node. */
  slots: string | undefined;
  /** The rings drawn, as "slot:isActive" pairs: "0:1,2:0". */
  rings: string;
  /** Slot of the visited set that tints the node, or -1. */
  reachedSlot: number;
  pointerNames: string | undefined;
  status: CellStatus | null;
  /** The shown step while `status` is set (replays the fade); 0 otherwise, so unchanged nodes stay memoised. */
  haloStep: number;
  isReduced: boolean;
  transition: Transition;
}

function parseRings(rings: string): { slot: number; isActive: boolean }[] {
  if (rings === "") return [];
  return rings.split(",").map((pair) => {
    const [slot, isActive] = pair.split(":");
    return { slot: Number(slot), isActive: isActive === "1" };
  });
}

export const NodeShape = memo(function NodeShape({ nodeKey, label, title, x, y, slots, rings, reachedSlot, pointerNames, status, haloStep, isReduced, transition }: NodeShapeProps) {
  const ringList = parseRings(rings).slice(0, MAX_RINGS);
  const fit = fitLabel(label);
  return (
    <motion.g
      data-testid={`graph-node-${nodeKey}`}
      data-path-slots={slots}
      data-reached={reachedSlot >= 0 ? "true" : undefined}
      data-pointers={pointerNames}
      initial={{ opacity: 0, x, y }}
      animate={{ opacity: 1, x, y }}
      transition={transition}
    >
      <title>{title}</title>
      <circle r={NODE_RADIUS} strokeWidth={BASE_STROKE} className="fill-card stroke-muted-foreground/60" />
      {reachedSlot >= 0 ? <circle r={NODE_RADIUS} className="ptr-fill" style={{ ...pointerStyle(reachedSlot), fillOpacity: REACHED_FILL_OPACITY }} /> : null}
      {ringList.map((ring, index) => (
        <circle key={ring.slot} r={ringRadius(index)} fill="none" strokeWidth={RING_WIDTH} className={cn("ptr-stroke", !ring.isActive && "ptr-dim")} style={pointerStyle(ring.slot)} />
      ))}
      {status === null ? null : (
        <motion.circle
          key={`halo-${haloStep}`}
          data-halo={status}
          aria-hidden="true"
          r={outerRadius(ringList.length) + HALO_PAD}
          fill="none"
          strokeWidth={HALO_STROKE / 2}
          className={HALO_CLASS[status]}
          initial={{ opacity: HALO_NODE_OPACITY }}
          animate={{ opacity: isReduced ? HALO_NODE_OPACITY : 0 }}
          transition={HALO_TRANSITION}
        />
      )}
      <text textAnchor="middle" dominantBaseline="central" fontSize={fit.size} className="fill-foreground font-mono" pointerEvents="none">
        {fit.text}
      </text>
    </motion.g>
  );
});

interface NodeHolderProps {
  nodeKey: string;
  x: number;
  y: number;
  /** Outer radius of the node (its path rings included): pointer rings go around it. */
  radius: number;
  pointers: readonly Pointer[];
  /** Same key, same rings and chips: the holder is not redrawn even if `pointers` is a new array. */
  pointersKey: string;
  transition: Transition;
}

function sameHolder(a: NodeHolderProps, b: NodeHolderProps): boolean {
  return a.nodeKey === b.nodeKey && a.x === b.x && a.y === b.y && a.radius === b.radius && a.pointersKey === b.pointersKey && a.transition === b.transition;
}

/** HTML holder that moves with its node (so rings never lag a node that is animating); draws pointer rings and chips when there are any. */
export const NodeHolder = memo(function NodeHolder({ nodeKey, x, y, radius, pointers, transition }: NodeHolderProps) {
  return (
    <motion.div className="absolute top-0 left-0" initial={{ opacity: 0, x, y }} animate={{ opacity: 1, x, y }} transition={transition}>
      {pointers.length === 0 ? null : (
        <div
          data-testid={`graph-pointers-${nodeKey}`}
          className="relative -translate-x-1/2 -translate-y-1/2 rounded-full transition-shadow duration-150"
          style={{ width: radius * 2, height: radius * 2, ...pointerRing(pointers) }}
        >
          <PointerMarks pointers={pointers} />
        </div>
      )}
    </motion.div>
  );
}, sameHolder);
