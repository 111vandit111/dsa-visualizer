import type { SValue } from "@/lib/tracer/types";
import { cellStatus, objectStatus, valueKey, type StepDiff } from "@/lib/viz/diff";
import { layoutGraph } from "@/lib/viz/graph-layout";
import { buildGraphModel } from "@/lib/viz/graph-model";
import type { GraphEdge, GraphLayout, GraphModel, GraphNode, Pointer, PointerTarget, StepPaths, StepPointers } from "@/lib/viz/overlay-types";
import { resolvePathNodes } from "@/lib/viz/paths";
import type { CellStatus, ObjectTable } from "@/lib/viz/types";

/** A path (or visited set) that goes through a node or edge: its palette slot and name. */
export interface PathMark {
  slot: number;
  name: string;
  isActive: boolean;
}

export interface GraphNodeView {
  key: string;
  label: string;
  title: string;
  /** Layout units. */
  position: { x: number; y: number };
  pointers: readonly Pointer[];
  /** What the pointers draw (names, slots, values): equal keys mean the same rings and chips, so a node can skip re-rendering. */
  pointersKey: string;
  status: CellStatus | null;
  /** Ascending by slot. */
  pathMarks: readonly PathMark[];
  /** The first visited-like set holding this node (it tints the node). */
  reached: PathMark | null;
}

export interface GraphEdgeView {
  key: string;
  from: number;
  to: number;
  weight: string | null;
  title: string;
  status: CellStatus | null;
  pathMarks: readonly PathMark[];
  /** Both ends are in a visited-like set. */
  isReached: boolean;
}

export interface LegendItem {
  name: string;
  slot: number;
  kind: "path" | "reached";
  isActive: boolean;
}

export interface GraphView {
  nodes: GraphNodeView[];
  edges: GraphEdgeView[];
  legend: LegendItem[];
}

// ------------------------------------------------------------------- model

/** Models per step: the object table of a step is immutable, so one build per (object, name) serves every caller of that step. */
const modelCache = new WeakMap<ObjectTable, Map<string, GraphModel | null>>();

/** `buildGraphModel`, built once per step for each (object id, variable name). */
export function graphModelFor(objects: ObjectTable, objectId: number, nameHint: string | undefined): GraphModel | null {
  const key = `${objectId}|${nameHint ?? ""}`;
  const models = modelCache.get(objects) ?? new Map<string, GraphModel | null>();
  modelCache.set(objects, models);
  const cached = models.get(key);
  if (cached !== undefined) return cached;
  const model = buildGraphModel(objects, objectId, nameHint);
  models.set(key, model);
  return model;
}

// ------------------------------------------------------------------ layout

/** What stays the same while only values change: where the nodes sit and which nodes each edge joins. */
export interface GraphStructure {
  layout: GraphLayout;
  edges: readonly { from: number; to: number }[];
}

const STRUCTURE_CACHE_SIZE = 24;
const structureCache = new Map<string, GraphStructure>();

/** Nodes and edge keys: the part of a graph that decides where its nodes sit. */
function structureSignature(model: GraphModel): string {
  return `${model.nodes.length}|${model.edges.map((edge) => edge.key).join(",")}`;
}

/** The structure of a graph, recomputed only when its nodes or edges change (not when only values do); same object while it is the same. */
export function structureFor(model: GraphModel): GraphStructure {
  const signature = structureSignature(model);
  const cached = structureCache.get(signature);
  if (cached) return cached;
  const structure: GraphStructure = {
    layout: layoutGraph(model.nodes.length, model.edges),
    edges: model.edges.map((edge) => ({ from: edge.from, to: edge.to })),
  };
  if (structureCache.size >= STRUCTURE_CACHE_SIZE) {
    const oldest = structureCache.keys().next();
    if (!oldest.done) structureCache.delete(oldest.value);
  }
  structureCache.set(signature, structure);
  return structure;
}

/** The layout of a graph (see `structureFor`). */
export function layoutFor(model: GraphModel): GraphLayout {
  return structureFor(model).layout;
}

// ------------------------------------------------------------------- paths

/** Key of the edge a step from node `a` to node `b` walks along (undirected edges are stored smaller index first). */
function edgeKeyOf(a: number, b: number, isDirected: boolean): string {
  return isDirected || a <= b ? `${a}>${b}` : `${b}>${a}`;
}

function addMark(marks: Map<string, PathMark[]>, key: string, mark: PathMark): void {
  const list = marks.get(key) ?? [];
  const known = list.find((item) => item.slot === mark.slot);
  if (known) known.isActive = known.isActive || mark.isActive;
  else list.push({ ...mark });
  marks.set(key, list);
}

const bySlot = (a: PathMark, b: PathMark): number => a.slot - b.slot;

interface PathOverlay {
  nodeMarks: Map<string, PathMark[]>;
  edgeMarks: Map<string, PathMark[]>;
  reached: Map<number, PathMark>;
  legend: LegendItem[];
}

/** The graph node a path/visited point names: a single value (grid cells have two and do not belong to a graph). */
function nodeOfPoint(model: GraphModel, point: readonly SValue[]): number | null {
  return point.length === 1 ? model.nodeIndexOfValue(point[0]) : null;
}

function resolvePaths(model: GraphModel, paths: StepPaths): PathOverlay {
  const overlay: PathOverlay = { nodeMarks: new Map(), edgeMarks: new Map(), reached: new Map(), legend: [] };
  const edgeKeys = new Set(model.edges.map((edge) => edge.key));
  for (const sequence of paths.sequences) {
    const nodes = resolvePathNodes(sequence.points, (point) => nodeOfPoint(model, point));
    if (nodes.length === 0) continue;
    const mark: PathMark = { slot: sequence.slot, name: sequence.name, isActive: sequence.isActive };
    overlay.legend.push({ name: sequence.name, slot: sequence.slot, kind: "path", isActive: sequence.isActive });
    nodes.forEach((node, step) => {
      addMark(overlay.nodeMarks, String(node), mark);
      const key = step > 0 ? edgeKeyOf(nodes[step - 1], node, model.isDirected) : null;
      if (key !== null && edgeKeys.has(key)) addMark(overlay.edgeMarks, key, mark);
    });
  }
  for (const set of paths.reached) {
    const mark: PathMark = { slot: set.slot, name: set.name, isActive: true };
    let isRelevant = false;
    for (const point of set.points) {
      const node = nodeOfPoint(model, point);
      if (node === null) continue;
      isRelevant = true;
      if (!overlay.reached.has(node)) overlay.reached.set(node, mark);
    }
    if (isRelevant) overlay.legend.push({ name: set.name, slot: set.slot, kind: "reached", isActive: true });
  }
  return overlay;
}

// ---------------------------------------------------------------- statuses

const HOST_PATTERN = /^o(\d+)$/;

function objectIdOfHost(host: string): number | null {
  const match = HOST_PATTERN.exec(host);
  return match ? Number(match[1]) : null;
}

/** Id of the container a cell of `containerId` points at (a row of an adjacency list, a neighbour list). */
function cellRefId(objects: ObjectTable, containerId: number, cellKey: string): number | null {
  const container = objects[containerId];
  let value: SValue | undefined;
  if (container?.k === "array") value = container.items[Number(cellKey)];
  else if (container?.k === "object") value = container.entries.find(([name]) => name === cellKey)?.[1];
  else if (container?.k === "map") value = container.entries.find(([key]) => valueKey(key) === cellKey)?.[1];
  return value?.k === "ref" ? value.id : null;
}

interface StatusContext {
  objects: ObjectTable;
  diff: StepDiff;
  model: GraphModel;
  /** Nothing in the heap changed since the previous step: no halos to look for. */
  isUnchanged: boolean;
}

/** A node's own cell, the container behind that cell (its row / neighbour list), or for a node object its own fields. */
function targetStatus({ objects, diff }: StatusContext, target: PointerTarget): CellStatus | null {
  const id = objectIdOfHost(target.host);
  if (id === null) return null;
  if (target.cellKey !== null) {
    const behind = cellRefId(objects, id, target.cellKey);
    return cellStatus(diff, id, target.cellKey) ?? (behind === null ? null : objectStatus(diff, behind));
  }
  const own = objectStatus(diff, id);
  const node = objects[id];
  if (own || node?.k !== "object") return own;
  for (const [, value] of node.entries) {
    const status = value.k === "ref" ? objectStatus(diff, value.id) : null;
    if (status) return status;
  }
  return null;
}

function nodeStatus(context: StatusContext, index: number): CellStatus | null {
  if (context.isUnchanged) return null;
  for (const target of context.model.nodes[index].targets) {
    const status = targetStatus(context, target);
    if (status) return status;
  }
  return null;
}

/** A weighted neighbour is a `[vertex, weight]` pair: the vertex is what names the node. */
function neighborValue(objects: ObjectTable, item: SValue): SValue {
  const pair = item.k === "ref" ? objects[item.id] : undefined;
  return pair?.k === "array" && pair.items.length > 0 ? pair.items[0] : item;
}

/** Cell of the neighbour container `containerId` (some node's row / list) that stands for the edge to node `to`. */
function neighborCellKey({ objects, model }: StatusContext, containerId: number, to: number): string | null {
  if (model.format === "adjacency-matrix") return String(to);
  const list = objects[containerId];
  if (list?.k !== "array" && list?.k !== "set") return null;
  const index = list.items.findIndex((item) => model.nodeIndexOfValue(neighborValue(objects, item)) === to);
  if (index < 0) return null;
  return list.k === "array" ? String(index) : valueKey(list.items[index]);
}

/** The container holding a node's neighbours: its row (list / matrix) or its value in a keyed map. Null for other formats. */
function neighborsContainerId(objects: ObjectTable, node: GraphNode): number | null {
  const [target] = node.targets;
  if (!target || target.cellKey === null) return null;
  const hostId = objectIdOfHost(target.host);
  return hostId === null ? null : cellRefId(objects, hostId, target.cellKey);
}

/** Status of the "from -> to" edge for formats where a node's neighbours live in one container. */
function neighborStatus(context: StatusContext, from: number, to: number): CellStatus | null {
  const containerId = neighborsContainerId(context.objects, context.model.nodes[from]);
  if (containerId === null) return null;
  const cellKey = neighborCellKey(context, containerId, to);
  return cellKey === null ? null : cellStatus(context.diff, containerId, cellKey);
}

function edgeStatus(context: StatusContext, edge: GraphEdge): CellStatus | null {
  if (context.isUnchanged) return null;
  const forward = neighborStatus(context, edge.from, edge.to);
  if (forward || context.model.isDirected) return forward;
  return neighborStatus(context, edge.to, edge.from);
}

// ----------------------------------------------------------------- the view

/** Pointers on any of a node's targets, one per variable (a matrix node has several cells). */
function nodePointers(targets: readonly PointerTarget[], pointers: StepPointers): Pointer[] {
  const seen = new Set<string>();
  const found: Pointer[] = [];
  for (const target of targets) {
    for (const pointer of pointers.at(target.host, target.cellKey)) {
      const key = `${pointer.frameId}:${pointer.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      found.push(pointer);
    }
  }
  return found;
}

function nodeTitle(label: string, pointers: readonly Pointer[], marks: readonly PathMark[], reached: PathMark | null): string {
  const parts = [`node ${label}`];
  if (pointers.length > 0) parts.push(`pointers: ${pointers.map((pointer) => pointer.name).join(", ")}`);
  if (marks.length > 0) parts.push(`on path: ${marks.map((mark) => mark.name).join(", ")}`);
  if (reached) parts.push(`reached: ${reached.name}`);
  return parts.join(" · ");
}

interface ViewInput {
  model: GraphModel;
  layout: GraphLayout;
  objects: ObjectTable;
  diff: StepDiff;
  pointers: StepPointers;
  paths: StepPaths;
}

/** Everything the canvas draws for one step: node/edge data plus pointers, paths, visited sets and change statuses. */
export function buildGraphView({ model, layout, objects, diff, pointers, paths }: ViewInput): GraphView {
  const context: StatusContext = { objects, diff, model, isUnchanged: diff.newIds.size === 0 && diff.containers.size === 0 };
  const overlay = resolvePaths(model, paths);
  const nodes = model.nodes.map((node, index): GraphNodeView => {
    const found = nodePointers(node.targets, pointers);
    const marks = [...(overlay.nodeMarks.get(String(index)) ?? [])].sort(bySlot);
    const reached = overlay.reached.get(index) ?? null;
    return {
      key: node.key,
      label: node.label,
      title: nodeTitle(node.label, found, marks, reached),
      position: layout.positions[index],
      pointers: found,
      pointersKey: found.map((pointer) => `${pointer.frameId}:${pointer.name}:${pointer.slot}:${pointer.isActive}:${pointer.isOutOfRange}:${valueKey(pointer.value)}`).join("|"),
      status: nodeStatus(context, index),
      pathMarks: marks,
      reached,
    };
  });
  const edges = model.edges.map((edge): GraphEdgeView => {
    const arrow = model.isDirected ? "→" : "–";
    const weight = edge.weight === null ? "" : ` (${edge.weight})`;
    return {
      key: edge.key,
      from: edge.from,
      to: edge.to,
      weight: edge.weight,
      title: `${model.nodes[edge.from].label} ${arrow} ${model.nodes[edge.to].label}${weight}`,
      status: edgeStatus(context, edge),
      pathMarks: [...(overlay.edgeMarks.get(edge.key) ?? [])].sort(bySlot),
      isReached: overlay.reached.has(edge.from) && overlay.reached.has(edge.to),
    };
  });
  return { nodes, edges, legend: overlay.legend };
}
