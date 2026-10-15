"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { VIZ_LIMITS } from "@/lib/viz/constants";
import type { Pointer } from "@/lib/viz/overlay-types";
import type { NodeColor } from "@/lib/viz/structures";
import type { CellStatus } from "@/lib/viz/types";
import { ChangeHalo } from "./change-halo";
import { markStackPx } from "./pointer-gutter";
import { PointerMarks } from "./pointer-marks";
import { pointerColor, pointerRing, pointerStyle } from "./pointer-styles";
import { TONE_STYLES, type Tone } from "./tones";

export type Relation = "self" | "parent" | "child";

export interface CanvasNode {
  key: string;
  label: string;
  /** Full text for the tooltip / screen readers. */
  title: string;
  /** Horizontal position in node-spacing units. */
  x: number;
  depth: number;
  status: CellStatus | null;
  relation: Relation | null;
  isEmphasized: boolean;
  caption?: string;
  /** Live variables pointing at this node: ring + name chips above it. */
  pointers?: readonly Pointer[];
  /** Slots of the DFS paths that run through this node (concentric rings in the path colours). */
  pathSlots?: readonly number[];
  /** Node was reached/visited: soft tint. */
  isReached?: boolean;
  /** Red-black colour: red or dark fill. */
  color?: NodeColor | null;
}

export interface CanvasEdge {
  key: string;
  fromKey: string;
  toKey: string;
  /** Text at the middle of the edge (trie character, map key). */
  label?: string | null;
  /** Slots of the DFS paths that walk along this edge (drawn thicker, side by side). */
  pathSlots?: readonly number[];
}

interface TreeCanvasProps {
  nodes: readonly CanvasNode[];
  edges: readonly CanvasEdge[];
  /** Width in node-spacing units. */
  width: number;
  levelCount: number;
  tone: Tone;
  ariaLabel: string;
  onHoverChange?: (key: string | null) => void;
}

const UNIT_X = 76;
/** Node spacing of wide trees (above COMPACT_FROM_UNITS): just over one bubble (52px), so they shrink less. */
const COMPACT_UNIT_X = 56;
const COMPACT_FROM_UNITS = 6;
const UNIT_Y = 64;
const PAD_X = 40;
const PAD_Y = 30;
const EDGE_BLUR = 2.5;
/** Half the height of a node bubble (40px circle + padding): the part of PAD_Y that chips cannot use. */
const NODE_HALF_PX = 26;
/** Gap between a node and its path rings, and the width of one ring. */
const PATH_RING_PX = 2;
const PATH_RING_GAP_PX = 1;
const PATH_EDGE_PX = 3;
/** Distance between the parallel lines of several paths on one edge. */
const PATH_EDGE_GAP_PX = 3;
const LABEL_OFFSET_PX = 8;
const NO_SLOTS: readonly number[] = [];
/** Smallest scale (nodes ~16px) before the canvas stops shrinking and scrolls instead. */
const MIN_FIT_SCALE = 0.4;
const PANEL_SELECTOR = "[data-testid='variables-panel']";
/** Right-hand chrome (cell border and padding) of the boxes a nested canvas sits in. */
const PANEL_RESERVE_PX = 12;

const RELATION_STYLES: Record<Relation, string> = {
  self: "border-foreground/80 bg-foreground/10",
  parent: "border-viz-cyan bg-viz-cyan/15",
  child: "border-primary/80 bg-primary/10",
};

/** Red-black fills: red in the rose token, black as the page ink with a visible rim. */
const COLOR_STYLES: Record<NodeColor, string> = {
  red: "border-viz-rose bg-viz-rose/30 text-foreground",
  black: "border-muted-foreground/70 bg-background text-foreground",
};

type Point = { x: number; y: number };

function unitXOf(width: number): number {
  return width > COMPACT_FROM_UNITS ? COMPACT_UNIT_X : UNIT_X;
}

function pointOf(node: CanvasNode, padTop: number, unitX: number): Point {
  return { x: PAD_X + node.x * unitX, y: padTop + node.depth * UNIT_Y };
}

/** Concentric rings (up to `maxPointerTags`) in the colours of the paths through a node. */
export function pathRing(slots: readonly number[]): CSSProperties | undefined {
  const rings = slots.slice(0, VIZ_LIMITS.maxPointerTags);
  if (rings.length === 0) return undefined;
  const layers = rings.flatMap((slot, index) => {
    const inner = index * (PATH_RING_PX + PATH_RING_GAP_PX);
    const band = `0 0 0 ${inner + PATH_RING_PX}px ${pointerColor(slot)}`;
    return index < rings.length - 1 ? [band, `0 0 0 ${inner + PATH_RING_PX + PATH_RING_GAP_PX}px var(--background)`] : [band];
  });
  return { boxShadow: layers.join(", ") };
}

/**
 * Room reserved above the top row. A constant band (a full chip stack plus "+n") as soon as any node has a pointer,
 * so the canvas does not change height as stacks grow and shrink, and chips on the root are never clipped.
 */
function topPadding(nodes: readonly CanvasNode[]): number {
  const hasPointers = nodes.some((node) => (node.pointers?.length ?? 0) > 0);
  if (!hasPointers) return PAD_Y;
  return PAD_Y + Math.max(0, markStackPx(VIZ_LIMITS.maxPointerTags + 1) - (PAD_Y - NODE_HALF_PX));
}

function NodeBubble({ node, tone, onHoverChange }: { node: CanvasNode; tone: Tone; onHoverChange?: (key: string | null) => void }) {
  const style = TONE_STYLES[tone];
  const pointers = node.pointers ?? [];
  const pathSlots = node.pathSlots ?? NO_SLOTS;
  const names = pointers.map((pointer) => pointer.name).join(", ");
  const title = names ? `${node.title} (${names})` : node.title;
  return (
    <div
      tabIndex={0}
      role="img"
      aria-label={title}
      title={title}
      data-testid={`tree-node-${node.key}`}
      data-path-slots={pathSlots.length > 0 ? pathSlots.join(",") : undefined}
      data-reached={node.isReached ? "true" : undefined}
      onPointerEnter={() => onHoverChange?.(node.key)}
      onPointerLeave={() => onHoverChange?.(null)}
      onFocus={() => onHoverChange?.(node.key)}
      onBlur={() => onHoverChange?.(null)}
      style={pathRing(pathSlots)}
      className="relative rounded-full bg-card p-1.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div
        className={cn(
          "relative flex min-h-10 min-w-10 items-center justify-center rounded-full border px-2 font-mono text-xs",
          style.border,
          style.surface,
          node.isEmphasized && style.glow,
          node.isReached && "border-primary/50 bg-primary/20",
          node.color && COLOR_STYLES[node.color],
          node.relation && RELATION_STYLES[node.relation],
        )}
        style={pointerRing(pointers)}
      >
        <ChangeHalo status={node.status} />
        <span className="whitespace-nowrap leading-none">{node.label}</span>
      </div>
      {pointers.length > 0 ? <PointerMarks pointers={pointers} /> : null}
      {node.caption === undefined ? null : (
        <span className="micro-label absolute -bottom-2.5 left-1/2 -translate-x-1/2 text-[9px] tracking-wider">{node.caption}</span>
      )}
    </div>
  );
}

interface EdgeLineProps {
  from: Point;
  to: Point;
  className: string;
  style?: CSSProperties;
  strokeWidth: number;
}

/** One glowing line that glides to its new ends when the layout changes. */
function EdgeLine({ from, to, className, style, strokeWidth }: EdgeLineProps) {
  return (
    <motion.line
      className={className}
      style={style}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      initial={{ opacity: 0, x1: from.x, y1: from.y, x2: to.x, y2: to.y }}
      animate={{ opacity: 1, x1: from.x, y1: from.y, x2: to.x, y2: to.y }}
      exit={{ opacity: 0 }}
      transition={spring.soft}
    />
  );
}

/** `from`/`to` moved sideways by `offset` px (perpendicular to the line), for paths drawn side by side. */
function shifted(from: Point, to: Point, offset: number): [Point, Point] {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const dx = (-(to.y - from.y) / length) * offset;
  const dy = ((to.x - from.x) / length) * offset;
  return [
    { x: from.x + dx, y: from.y + dy },
    { x: to.x + dx, y: to.y + dy },
  ];
}

interface EdgesProps {
  nodes: Map<string, CanvasNode>;
  edges: readonly CanvasEdge[];
  filterId: string;
  tone: Tone;
  size: { width: number; height: number };
  padTop: number;
  unitX: number;
}

function Edges({ nodes, edges, filterId, tone, size, padTop, unitX }: EdgesProps) {
  const drawn = edges.flatMap((edge) => {
    const from = nodes.get(edge.fromKey);
    const to = nodes.get(edge.toKey);
    return from && to ? [{ edge, a: pointOf(from, padTop, unitX), b: pointOf(to, padTop, unitX) }] : [];
  });
  return (
    <svg width={size.width} height={size.height} className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden="true">
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={EDGE_BLUR} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#${filterId})`}>
        <AnimatePresence initial={false}>
          {drawn.map(({ edge, a, b }) => (
            <EdgeLine key={edge.key} from={a} to={b} className={TONE_STYLES[tone].stroke} strokeWidth={1.5} />
          ))}
          {drawn.flatMap(({ edge, a, b }) => {
            const slots = edge.pathSlots ?? NO_SLOTS;
            return slots.map((slot, index) => {
              const [from, to] = shifted(a, b, (index - (slots.length - 1) / 2) * PATH_EDGE_GAP_PX);
              return (
                <EdgeLine
                  key={`${edge.key}:path${slot}`}
                  from={from}
                  to={to}
                  className="ptr-stroke"
                  style={pointerStyle(slot)}
                  strokeWidth={PATH_EDGE_PX}
                />
              );
            });
          })}
        </AnimatePresence>
      </g>
      {drawn.map(({ edge, a, b }) =>
        edge.label ? (
          <motion.text
            key={`${edge.key}:label`}
            data-testid="tree-edge-label"
            className="fill-muted-foreground font-mono text-[10px]"
            stroke="var(--background)"
            strokeWidth={3}
            paintOrder="stroke"
            dominantBaseline="middle"
            initial={false}
            animate={{ x: (a.x + b.x) / 2 + LABEL_OFFSET_PX, y: (a.y + b.y) / 2 }}
            transition={spring.soft}
          >
            {edge.label}
          </motion.text>
        ) : null,
      )}
    </svg>
  );
}

/**
 * Widest the canvas may be so it never pushes its panel wider: a nested canvas sits in shrink-to-fit cells, which size
 * themselves to it, so `max-w-full` alone does not hold it back. Measured to the right edge of the variables panel.
 */
function usePanelLimit(containerRef: RefObject<HTMLDivElement | null>): number | undefined {
  const [limit, setLimit] = useState<number>();
  useEffect(() => {
    const element = containerRef.current;
    const bounds = element?.closest<HTMLElement>(PANEL_SELECTOR);
    if (!element || !bounds) return;
    const measure = () => {
      const padding = Number.parseFloat(getComputedStyle(bounds).paddingRight) || 0;
      setLimit(Math.max(0, Math.floor(bounds.getBoundingClientRect().right - padding - element.getBoundingClientRect().left - PANEL_RESERVE_PX)));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(bounds);
    return () => observer.disconnect();
  }, [containerRef]);
  return limit;
}

/** Scale (MIN_FIT_SCALE to 1) that makes content of `contentWidth` px fit its container; below that the container scrolls. */
function useTreeFit(contentWidth: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => setAvailableWidth(entries[0]?.contentRect.width ?? 0));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const fit = availableWidth > 0 && contentWidth > 0 ? availableWidth / contentWidth : 1;
  return { containerRef, scale: Math.min(1, Math.max(MIN_FIT_SCALE, fit)) };
}

/** When the canvas is wider than its box (and scrolls), start with the root in view instead of the left edge. */
function useCenterOnRoot(containerRef: RefObject<HTMLDivElement | null>, rootX: number, contentWidth: number) {
  useEffect(() => {
    const element = containerRef.current;
    if (element) element.scrollLeft = Math.max(0, rootX - element.clientWidth / 2);
  }, [containerRef, rootX, contentWidth]);
}

/** Nodes (absolutely positioned DOM) over soft-glow SVG edges; positions animate between steps. */
export function TreeCanvas({ nodes, edges, width, levelCount, tone, ariaLabel, onHoverChange }: TreeCanvasProps) {
  const filterId = `glow-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const padTop = topPadding(nodes);
  const unitX = unitXOf(width);
  const size = { width: PAD_X * 2 + width * unitX, height: padTop + PAD_Y + Math.max(levelCount - 1, 0) * UNIT_Y };
  const { containerRef, scale } = useTreeFit(size.width);
  const maxWidth = usePanelLimit(containerRef);
  const rootX = nodes.length > 0 ? pointOf(nodes[0], padTop, unitX).x : 0;
  useCenterOnRoot(containerRef, rootX * scale, size.width * scale);
  const byKey = new Map(nodes.map((node) => [node.key, node]));
  return (
    <div ref={containerRef} role="group" aria-label={ariaLabel} style={{ maxWidth }} className="w-full max-w-full overflow-x-auto overflow-y-hidden [scrollbar-color:var(--muted-foreground)_transparent] [scrollbar-width:thin]">
      <div className="overflow-hidden" style={{ width: size.width * scale, height: size.height * scale }}>
        <div className="relative origin-top-left" style={{ width: size.width, height: size.height, transform: `scale(${scale})` }}>
          <Edges nodes={byKey} edges={edges} filterId={filterId} tone={tone} size={size} padTop={padTop} unitX={unitX} />
          <AnimatePresence initial={false}>
            {nodes.map((node) => {
              const point = pointOf(node, padTop, unitX);
              return (
                <motion.div
                  key={node.key}
                  className="absolute top-0 left-0"
                  initial={{ x: point.x, y: point.y, opacity: 0, scale: 0.6 }}
                  animate={{ x: point.x, y: point.y, opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={spring.soft}
                >
                  <div className="-translate-x-1/2 -translate-y-1/2">
                    <NodeBubble node={node} tone={tone} onHoverChange={onHoverChange} />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
