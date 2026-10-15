"use client";

import { useId, useMemo, type ReactElement } from "react";
import { AnimatePresence, useReducedMotion, type Transition } from "framer-motion";
import { spring } from "@/lib/motion";
import { canvasSize, edgeShape, loopShape, MAX_RINGS, NODE_RADIUS, outerRadius, PAIR_BEND, pointOf, type EdgeShape, type Point } from "./graph-geometry";
import { EdgeHalo, EdgeLine, INSTANT, Markers, NodeHolder, NodeShape, paletteIndex, PathStroke, WeightLabel } from "./graph-layers";
import type { GraphEdgeView, GraphNodeView, GraphStructure, PathMark } from "./graph-overlay";
import { useFitScale } from "./use-fit-scale";

interface GraphCanvasProps {
  nodes: readonly GraphNodeView[];
  edges: readonly GraphEdgeView[];
  /** Node positions and edge ends: the same object for as long as the graph keeps its shape, so pixel geometry is computed once. */
  structure: GraphStructure;
  isDirected: boolean;
  /** The shown step: restarts the change-halo fade. */
  stepIndex: number;
  ariaLabel: string;
}

/** Distance between the centres of two path strokes that share an edge. */
const PATH_SPACING = 4;

const slotsOf = (marks: readonly PathMark[]): string | undefined => (marks.length === 0 ? undefined : marks.map((mark) => mark.slot).join(","));

interface EdgeLayers {
  lines: ReactElement[];
  strokes: ReactElement[];
  halos: ReactElement[];
  labels: ReactElement[];
}

/** Where the nodes and the plain (no ring at either end) edges sit: depends on the structure only. */
interface PlainGeometry {
  centers: readonly Point[];
  /** Per edge, in the structure's order. */
  edges: readonly { shape: EdgeShape; hasReverse: boolean }[];
}

interface Frame {
  id: string;
  plain: PlainGeometry;
  centers: readonly Point[];
  /** Outer radius of each node (rings included): edges stop there. */
  radii: readonly number[];
  isDirected: boolean;
  transition: Transition;
  stepIndex: number;
  isReduced: boolean;
}

const straightGap = (isDirected: boolean): number => NODE_RADIUS + (isDirected ? 1 : 0);

function bendOf(hasReverse: boolean): number {
  return hasReverse ? PAIR_BEND : 0;
}

function plainGeometry({ layout, edges }: GraphStructure, isDirected: boolean): PlainGeometry {
  const centers = layout.positions.map(pointOf);
  const keys = new Set(edges.map((edge) => `${edge.from}>${edge.to}`));
  return {
    centers,
    edges: edges.map((edge) => {
      const [a, b] = [centers[edge.from], centers[edge.to]];
      const hasReverse = isDirected && keys.has(`${edge.to}>${edge.from}`);
      if (edge.from === edge.to) return { shape: loopShape(a, NODE_RADIUS), hasReverse };
      return { shape: edgeShape(a, b, { bend: bendOf(hasReverse), offset: 0, startGap: NODE_RADIUS, endGap: straightGap(isDirected) }), hasReverse };
    }),
  };
}

/** The edge's line for a sideways shift (path strokes of one edge are shifted side by side), cut short at the nodes' outer rings. */
function shapeOf(edge: GraphEdgeView, frame: Frame, hasReverse: boolean): (offset: number) => EdgeShape {
  const [a, b] = [frame.centers[edge.from], frame.centers[edge.to]];
  if (edge.from === edge.to) return () => loopShape(a, frame.radii[edge.from]);
  const endGap = frame.radii[edge.to] + (frame.isDirected ? 1 : 0);
  return (offset) => edgeShape(a, b, { bend: bendOf(hasReverse), offset, startGap: frame.radii[edge.from], endGap });
}

/** Elements of every edge: its line, path strokes, change flash and weight label. */
function edgeLayers(edges: readonly GraphEdgeView[], frame: Frame): EdgeLayers {
  const layers: EdgeLayers = { lines: [], strokes: [], halos: [], labels: [] };
  edges.forEach((edge, index) => {
    const { shape: plainShape, hasReverse } = frame.plain.edges[index];
    const isPlain = frame.radii[edge.from] === NODE_RADIUS && frame.radii[edge.to] === NODE_RADIUS;
    const shapeAt = shapeOf(edge, frame, hasReverse);
    const base = isPlain ? plainShape : shapeAt(0);
    layers.lines.push(
      <EdgeLine
        key={edge.key}
        edgeKey={edge.key}
        d={base.d}
        title={edge.title}
        slots={slotsOf(edge.pathMarks)}
        isReached={edge.isReached}
        markerEnd={frame.isDirected ? `url(#${frame.id}-arrow)` : undefined}
        transition={frame.transition}
      />,
    );
    edge.pathMarks.forEach((mark, order) => {
      const offset = (order - (edge.pathMarks.length - 1) / 2) * PATH_SPACING;
      layers.strokes.push(
        <PathStroke
          key={`${edge.key}:${mark.slot}`}
          edgeKey={edge.key}
          slot={mark.slot}
          isActive={mark.isActive}
          d={shapeAt(offset).d}
          markerEnd={frame.isDirected ? `url(#${frame.id}-arrow-${paletteIndex(mark.slot)})` : undefined}
          transition={frame.transition}
        />,
      );
    });
    if (edge.status !== null) {
      layers.halos.push(<EdgeHalo key={`${edge.key}-${frame.stepIndex}`} d={base.d} status={edge.status} isReduced={frame.isReduced} />);
    }
    if (edge.weight !== null) {
      layers.labels.push(<WeightLabel key={edge.key} edgeKey={edge.key} text={edge.weight} x={base.label.x} y={base.label.y} transition={frame.transition} />);
    }
  });
  return layers;
}

function nodeElement(node: GraphNodeView, center: Point, frame: Frame): ReactElement {
  const rings = node.pathMarks.slice(0, MAX_RINGS).map((mark) => `${mark.slot}:${mark.isActive ? 1 : 0}`);
  return (
    <NodeShape
      key={node.key}
      nodeKey={node.key}
      label={node.label}
      title={node.title}
      x={center.x}
      y={center.y}
      slots={slotsOf(node.pathMarks)}
      rings={rings.join(",")}
      reachedSlot={node.reached ? node.reached.slot : -1}
      pointerNames={node.pointers.length === 0 ? undefined : node.pointers.map((pointer) => pointer.name).join(",")}
      status={node.status}
      haloStep={node.status === null ? 0 : frame.stepIndex}
      isReduced={frame.isReduced}
      transition={frame.transition}
    />
  );
}

/** Slots (one per palette colour) of the paths that need a coloured arrowhead. */
function arrowSlotList(edges: readonly GraphEdgeView[], isDirected: boolean): string {
  if (!isDirected) return "";
  const byColour = new Map<number, number>();
  for (const edge of edges) for (const mark of edge.pathMarks) byColour.set(paletteIndex(mark.slot), mark.slot);
  return [...byColour.values()].sort((a, b) => a - b).join(",");
}

/**
 * Node-link diagram: SVG edges and nodes (positions animate between steps), HTML pointer rings and name chips on top.
 * Only the few path strokes use AnimatePresence: wrapping every edge and node in it costs more per step than the
 * whole rest of the graph, and nodes/edges only come and go when the graph itself changes.
 */
export function GraphCanvas({ nodes, edges, structure, isDirected, stepIndex, ariaLabel }: GraphCanvasProps) {
  const id = `graph-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const isReduced = useReducedMotion() === true;
  const size = canvasSize(structure.layout.width, structure.layout.height);
  const { containerRef, scale } = useFitScale(size.width);
  const plain = useMemo(() => plainGeometry(structure, isDirected), [structure, isDirected]);
  const { centers } = plain;
  const radii = nodes.map((node) => outerRadius(Math.min(node.pathMarks.length, MAX_RINGS)));
  const frame: Frame = { id, plain, centers, radii, isDirected, transition: isReduced ? INSTANT : spring.snappy, stepIndex, isReduced };
  const layers = edgeLayers(edges, frame);
  return (
    <div ref={containerRef} className="w-full max-w-full overflow-x-auto overflow-y-hidden">
      <div style={{ width: size.width * scale, height: size.height * scale }}>
        <div className="relative origin-top-left" style={{ width: size.width, height: size.height, transform: `scale(${scale})` }}>
          <svg width={size.width} height={size.height} viewBox={`0 0 ${size.width} ${size.height}`} role="img" aria-label={ariaLabel} className="absolute inset-0 overflow-visible">
            <Markers id={id} slotList={arrowSlotList(edges, isDirected)} />
            {layers.lines}
            <g filter={`url(#${id}-glow)`}>
              <AnimatePresence initial={false}>{layers.strokes}</AnimatePresence>
              {layers.halos}
            </g>
            {layers.labels}
            {nodes.map((node, index) => nodeElement(node, centers[index], frame))}
          </svg>
          <div className="pointer-events-none absolute inset-0">
            {nodes.map((node, index) => (
              <NodeHolder
                key={node.key}
                nodeKey={node.key}
                x={centers[index].x}
                y={centers[index].y}
                radius={radii[index]}
                pointers={node.pointers}
                pointersKey={node.pointersKey}
                transition={frame.transition}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
