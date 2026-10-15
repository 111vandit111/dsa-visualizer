import type { GraphLayout } from "./overlay-types";

type Point = { x: number; y: number };

/** Ideal edge length, in node-spacing units. */
const IDEAL_EDGE = 1.3;
const ITERATIONS = 150;
/** Largest move per iteration at the start; cools linearly to zero. */
const START_TEMPERATURE = IDEAL_EDGE;
/** Pull towards the centre so disconnected components stay on screen. */
const GRAVITY = 1;
/** Distance below which two nodes count as overlapping while forces are computed. */
const MIN_FORCE_DISTANCE = 0.01;
/** Neighbouring nodes on the starting circle are this far apart (min distance is 1). */
const CIRCLE_CHORD = 1.25;
const MIN_NODE_DISTANCE = 1;
/** The relaxation aims slightly past the minimum so rounding cannot leave a pair just under it. */
const RELAX_TARGET = MIN_NODE_DISTANCE * 1.02;
const RELAX_PASSES = 200;
const TAU = Math.PI * 2;

interface Edge { from: number; to: number }

/** Nodes evenly spread on a circle in index order, starting at the top. */
function circlePositions(count: number): Point[] {
  if (count === 1) return [{ x: 0, y: 0 }];
  const radius = CIRCLE_CHORD / (2 * Math.sin(Math.PI / count));
  return Array.from({ length: count }, (_, index) => {
    const angle = (TAU * index) / count - Math.PI / 2;
    return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
  });
}

/** Distinct links between two different, valid nodes (self loops and repeats do not shape the layout). */
function usableEdges(count: number, edges: readonly Edge[]): Edge[] {
  const seen = new Set<number>();
  const usable: Edge[] = [];
  for (const edge of edges) {
    const isValid = edge.from >= 0 && edge.to >= 0 && edge.from < count && edge.to < count && edge.from !== edge.to;
    const key = Math.min(edge.from, edge.to) * count + Math.max(edge.from, edge.to);
    if (!isValid || seen.has(key)) continue;
    seen.add(key);
    usable.push(edge);
  }
  return usable;
}

/** Unit vector from b to a; coincident points get a direction derived from their indices instead of a random one. */
function direction(a: Point, b: Point, seed: number): { dx: number; dy: number; distance: number } {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distance = Math.hypot(dx, dy);
  if (distance >= MIN_FORCE_DISTANCE) return { dx: dx / distance, dy: dy / distance, distance };
  const angle = seed * 2.399963229728653;
  return { dx: Math.cos(angle), dy: Math.sin(angle), distance: MIN_FORCE_DISTANCE };
}

function repulsion(points: readonly Point[], force: Point[]): void {
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const { dx, dy, distance } = direction(points[i], points[j], i * points.length + j);
      const push = (IDEAL_EDGE * IDEAL_EDGE) / distance;
      force[i].x += dx * push;
      force[i].y += dy * push;
      force[j].x -= dx * push;
      force[j].y -= dy * push;
    }
  }
}

function attraction(points: readonly Point[], edges: readonly Edge[], force: Point[]): void {
  for (const { from, to } of edges) {
    const { dx, dy, distance } = direction(points[from], points[to], from * points.length + to);
    const pull = (distance * distance) / IDEAL_EDGE;
    force[from].x -= dx * pull;
    force[from].y -= dy * pull;
    force[to].x += dx * pull;
    force[to].y += dy * pull;
  }
}

/** Fruchterman-Reingold: nodes repel, edges pull, the largest move shrinks every iteration. */
function forceDirected(start: readonly Point[], edges: readonly Edge[]): Point[] {
  const points = start.map((point) => ({ ...point }));
  for (let iteration = 0; iteration < ITERATIONS; iteration++) {
    const temperature = START_TEMPERATURE * (1 - iteration / ITERATIONS);
    const force = points.map(() => ({ x: 0, y: 0 }));
    repulsion(points, force);
    attraction(points, edges, force);
    points.forEach((point, index) => {
      const pull = { x: force[index].x - GRAVITY * point.x, y: force[index].y - GRAVITY * point.y };
      const length = Math.hypot(pull.x, pull.y);
      const step = Math.min(length, temperature);
      if (length > 0) {
        point.x += (pull.x / length) * step;
        point.y += (pull.y / length) * step;
      }
    });
  }
  return points;
}

/** Pushes overlapping pairs apart until every pair is at least RELAX_TARGET away (or the passes run out). */
function relax(points: Point[]): void {
  for (let pass = 0; pass < RELAX_PASSES; pass++) {
    let isMoved = false;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const { dx, dy, distance } = direction(points[i], points[j], i * points.length + j);
        if (distance >= RELAX_TARGET) continue;
        const shift = (RELAX_TARGET - distance) / 2;
        points[i].x += dx * shift;
        points[i].y += dy * shift;
        points[j].x -= dx * shift;
        points[j].y -= dy * shift;
        isMoved = true;
      }
    }
    if (!isMoved) return;
  }
}

function minDistance(points: readonly Point[]): number {
  let smallest = Infinity;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) smallest = Math.min(smallest, Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y));
  }
  return smallest;
}

/** Moves the drawing so its left/top edges sit at 0 and reports its size. */
function normalize(points: Point[]): GraphLayout {
  const left = Math.min(...points.map((point) => point.x));
  const top = Math.min(...points.map((point) => point.y));
  const positions = points.map((point) => ({ x: point.x - left, y: point.y - top }));
  return {
    positions,
    width: Math.max(...positions.map((point) => point.x)),
    height: Math.max(...positions.map((point) => point.y)),
  };
}

/**
 * Deterministic node-link layout in node-spacing units: left/top edge at 0, every pair of nodes at least 1 apart.
 * Starts from a circle in index order, so the same input always gives the same drawing (no randomness, no clock).
 * One or two nodes, or no usable edges, stay on the circle.
 */
export function layoutGraph(nodeCount: number, edges: readonly { from: number; to: number }[]): GraphLayout {
  if (nodeCount <= 0) return { positions: [], width: 0, height: 0 };
  const start = circlePositions(nodeCount);
  const links = usableEdges(nodeCount, edges);
  if (nodeCount <= 2 || links.length === 0) return normalize(start);
  const points = forceDirected(start, links);
  relax(points);
  return normalize(minDistance(points) >= MIN_NODE_DISTANCE ? points : start);
}
