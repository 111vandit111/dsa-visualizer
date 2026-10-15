import { VIZ_LIMITS } from "@/lib/viz/constants";
import { markStackPx } from "./pointer-gutter";

export interface Point {
  x: number;
  y: number;
}

/** Pixels per node-spacing unit of the graph layout: wider than a name chip ("neighbor" is ~54px), so chips of neighbouring nodes never overlap. */
export const UNIT_PX = 66;
export const NODE_RADIUS = 18;
/** Room around the drawing: name chips sit above the top row, self loops hang below the bottom row. */
const PAD_X = 44;
/** Top row: node, its three pointer rings (up to 8px), then a full chip stack (3 chips and "+n"). Constant, so the canvas never changes height. */
const POINTER_RINGS_PX = 8;
const PAD_TOP = NODE_RADIUS + POINTER_RINGS_PX + markStackPx(VIZ_LIMITS.maxPointerTags + 1);
const PAD_BOTTOM = 40;

/** Concentric path rings around a node: stroke width, distance between rings, and the most that are drawn. */
export const RING_WIDTH = 2;
const RING_STEP = 4;
const RING_FIRST_GAP = 3;
export const MAX_RINGS = 3;

/** Sideways push of the arc used when both directions of a pair exist, and of the weight label from its line. */
export const PAIR_BEND = 20;
const LABEL_GAP = 7;
/** Self loop: how far its control points reach below the node. */
const LOOP_REACH = 24;
const LOOP_HALF_WIDTH_RATIO = 0.5;
const LOOP_SPREAD_RATIO = 1.1;
const LOOP_LABEL_GAP = 8;
const DECIMALS = 100;

export interface EdgeShape {
  /** Always `M x y Q x y x y` (or `M C` for loops), so framer-motion can interpolate between two of them. */
  d: string;
  /** Where the weight label sits. */
  label: Point;
}

export interface EdgeOptions {
  /** Sideways push of the curve's control point (0: straight line). */
  bend: number;
  /** Sideways shift of the whole line: puts several path strokes of one edge side by side. */
  offset: number;
  /** Distance from each end node's centre to where the line stops (its outer ring, plus the arrowhead if any). */
  startGap: number;
  endGap: number;
}

const round = (value: number): number => Math.round(value * DECIMALS) / DECIMALS;
const text = (point: Point): string => `${round(point.x)} ${round(point.y)}`;
const along = (from: Point, to: Point, distance: number): Point => {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  return length === 0 ? from : { x: from.x + ((to.x - from.x) / length) * distance, y: from.y + ((to.y - from.y) / length) * distance };
};

/** Pixel centre of a node at `position` (layout units). */
export function pointOf(position: Point): Point {
  return { x: PAD_X + position.x * UNIT_PX, y: PAD_TOP + position.y * UNIT_PX };
}

export function canvasSize(width: number, height: number): { width: number; height: number } {
  return { width: PAD_X * 2 + width * UNIT_PX, height: PAD_TOP + PAD_BOTTOM + height * UNIT_PX };
}

/** Radius of ring `index` (0 = innermost) around a node. */
export function ringRadius(index: number): number {
  return NODE_RADIUS + RING_FIRST_GAP + index * RING_STEP;
}

/** Radius of the outermost of `ringCount` rings, edges and arrowheads stop here. */
export function outerRadius(ringCount: number): number {
  return ringCount > 0 ? ringRadius(ringCount - 1) + RING_WIDTH / 2 + 1 : NODE_RADIUS;
}

/** Edge between two node centres: a straight line or a quadratic arc, cut short at both nodes. */
export function edgeShape(a: Point, b: Point, { bend, offset, startGap, endGap }: EdgeOptions): EdgeShape {
  const direction = along({ x: 0, y: 0 }, { x: b.x - a.x, y: b.y - a.y }, 1);
  const normal: Point = { x: -direction.y, y: direction.x };
  const control: Point = { x: (a.x + b.x) / 2 + normal.x * bend, y: (a.y + b.y) / 2 + normal.y * bend };
  const shift = (point: Point): Point => ({ x: point.x + normal.x * offset, y: point.y + normal.y * offset });
  const start = shift(along(a, control, startGap));
  const end = shift(along(b, control, endGap));
  const middle = shift(control);
  // Straight lines put the label on the upper side; arcs put it on the side they bulge to.
  const side = bend === 0 ? (normal.y > 0 ? -1 : 1) : Math.sign(bend);
  const label: Point = {
    x: (start.x + 2 * middle.x + end.x) / 4 + normal.x * side * LABEL_GAP,
    y: (start.y + 2 * middle.y + end.y) / 4 + normal.y * side * LABEL_GAP,
  };
  return { d: `M${text(start)} Q${text(middle)} ${text(end)}`, label };
}

/** Small loop below a node for an edge to itself; `radius` is the node's outer radius (where the arrowhead lands). */
export function loopShape(center: Point, radius: number): EdgeShape {
  const half = radius * LOOP_HALF_WIDTH_RATIO;
  const drop = Math.sqrt(radius * radius - half * half);
  const reach = radius + LOOP_REACH;
  const start: Point = { x: center.x - half, y: center.y + drop };
  const end: Point = { x: center.x + half, y: center.y + drop };
  const first: Point = { x: center.x - radius * LOOP_SPREAD_RATIO, y: center.y + reach };
  const second: Point = { x: center.x + radius * LOOP_SPREAD_RATIO, y: center.y + reach };
  const apex = (start.y + 3 * first.y + 3 * second.y + end.y) / 8;
  return { d: `M${text(start)} C${text(first)} ${text(second)} ${text(end)}`, label: { x: center.x, y: apex + LOOP_LABEL_GAP } };
}
