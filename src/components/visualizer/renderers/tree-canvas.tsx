"use client";

import { useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { CellStatus } from "@/lib/viz/types";
import { ChangeHalo } from "./change-halo";
import { TONE_STYLES, type Tone } from "./tones";
import { useFitScale } from "./use-fit-scale";

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
}

export interface CanvasEdge {
  key: string;
  fromKey: string;
  toKey: string;
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
const UNIT_Y = 64;
const PAD_X = 40;
const PAD_Y = 30;
const EDGE_BLUR = 2.5;

const RELATION_STYLES: Record<Relation, string> = {
  self: "border-foreground/80 bg-foreground/10",
  parent: "border-viz-cyan bg-viz-cyan/15",
  child: "border-primary/80 bg-primary/10",
};

function pointOf(node: CanvasNode): { x: number; y: number } {
  return { x: PAD_X + node.x * UNIT_X, y: PAD_Y + node.depth * UNIT_Y };
}

function NodeBubble({ node, tone, onHoverChange }: { node: CanvasNode; tone: Tone; onHoverChange?: (key: string | null) => void }) {
  const style = TONE_STYLES[tone];
  return (
    <div
      tabIndex={0}
      role="img"
      aria-label={node.title}
      title={node.title}
      onPointerEnter={() => onHoverChange?.(node.key)}
      onPointerLeave={() => onHoverChange?.(null)}
      onFocus={() => onHoverChange?.(node.key)}
      onBlur={() => onHoverChange?.(null)}
      className="relative rounded-full bg-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div
        className={cn(
          "relative flex min-h-10 min-w-10 items-center justify-center rounded-full border px-2 font-mono text-xs",
          style.border,
          style.surface,
          node.isEmphasized && style.glow,
          node.relation && RELATION_STYLES[node.relation],
        )}
      >
        <ChangeHalo status={node.status} />
        <span className="whitespace-nowrap leading-none">{node.label}</span>
      </div>
      {node.caption === undefined ? null : (
        <span className="micro-label absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] tracking-wider">{node.caption}</span>
      )}
    </div>
  );
}

function Edges({ nodes, edges, filterId, tone, size }: { nodes: Map<string, CanvasNode>; edges: readonly CanvasEdge[]; filterId: string; tone: Tone; size: { width: number; height: number } }) {
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
          {edges.map((edge) => {
            const from = nodes.get(edge.fromKey);
            const to = nodes.get(edge.toKey);
            if (!from || !to) return null;
            const a = pointOf(from);
            const b = pointOf(to);
            return (
              <motion.line
                key={edge.key}
                className={TONE_STYLES[tone].stroke}
                strokeWidth={1.5}
                strokeLinecap="round"
                initial={{ opacity: 0, x1: a.x, y1: a.y, x2: b.x, y2: b.y }}
                animate={{ opacity: 1, x1: a.x, y1: a.y, x2: b.x, y2: b.y }}
                exit={{ opacity: 0 }}
                transition={spring.soft}
              />
            );
          })}
        </AnimatePresence>
      </g>
    </svg>
  );
}

/** Nodes (absolutely positioned DOM) over soft-glow SVG edges; positions animate between steps. */
export function TreeCanvas({ nodes, edges, width, levelCount, tone, ariaLabel, onHoverChange }: TreeCanvasProps) {
  const filterId = `glow-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const size = { width: PAD_X * 2 + width * UNIT_X, height: PAD_Y * 2 + Math.max(levelCount - 1, 0) * UNIT_Y };
  const { containerRef, scale } = useFitScale(size.width);
  const byKey = new Map(nodes.map((node) => [node.key, node]));
  return (
    <div ref={containerRef} role="group" aria-label={ariaLabel} className="w-full max-w-full overflow-x-auto overflow-y-hidden">
      <div style={{ width: size.width * scale, height: size.height * scale }}>
        <div className="relative origin-top-left" style={{ width: size.width, height: size.height, transform: `scale(${scale})` }}>
          <Edges nodes={byKey} edges={edges} filterId={filterId} tone={tone} size={size} />
          <AnimatePresence initial={false}>
            {nodes.map((node) => {
              const point = pointOf(node);
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
