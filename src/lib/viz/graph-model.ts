import type { SObject, SValue } from "@/lib/tracer/types";
import { VIZ_LIMITS } from "./constants";
import { valueKey } from "./diff";
import { nodeLabel } from "./format";
import { objectHost, type GraphEdge, type GraphFormat, type GraphModel, type GraphNode, type PointerTarget } from "./overlay-types";
import { pickNodeValue } from "./structures";
import type { ObjectTable } from "./types";

type ObjectOf = Extract<SObject, { k: "object" }>;
type ArrayOf = Extract<SObject, { k: "array" }>;
type MapOf = Extract<SObject, { k: "map" }>;
type IdValue = { k: "number"; v: number } | { k: "string"; v: string };

/** Fields of a node object that list its neighbours (deliberately not left/right/children: those are trees). */
const NEIGHBOR_FIELD = /^(neighbou?rs|adj|adjacent|adjacency|edges|connections|friends|nexts?|links|outgoing|successors|out)$/i;
/** Neighbour fields that make an object a graph node even while its list is still empty. */
const CERTAIN_NEIGHBOR_FIELD = /^(neighbou?rs|adj|adjacent|adjacency)$/i;
/** Variable-name hints for telling `[[a, b], ...]` apart: edge list vs adjacency structure. */
const EDGE_NAME = /edge|link|pair|road|flight|prereq/i;
const GRAPH_NAME = /graph|adj|neigh|net/i;
/** Names under which an array of node objects reads as the graph even when it does not hold every node. */
const NODE_ARRAY_NAME = /graph|adj|neigh|net|node|vert/i;
/** Share of adjacency items that must be keys of the same map for it to count as a graph. */
const KEYED_MIN_MATCH_RATIO = 0.5;
const MIN_MATRIX_SIZE = 2;
const EDGE_ROW_LENGTHS: readonly number[] = [2, 3];
const PAIR_LENGTH = 2;

interface RawEdge { from: number; to: number; weight: string | null }

/** A graph as one format builder sees it, before duplicate/undirected edges are cleaned up. */
interface RawGraph {
  format: GraphFormat;
  nodes: GraphNode[];
  edges: RawEdge[];
  /** valueKey of a path point -> node index. */
  lookup: Map<string, number>;
  isTruncated: boolean;
  /** A graph with no edges yet still counts (a node object whose neighbours list is empty). */
  isEdgelessAllowed?: boolean;
}

const isIdValue = (value: SValue | undefined): value is IdValue => value !== undefined && ((value.k === "number" && Number.isFinite(value.v)) || value.k === "string");
/** An integer vertex number in [base, base + count): base 1 reads 1-indexed lists. */
const isIndexValue = (value: SValue | undefined, count: number, base: number): value is { k: "number"; v: number } =>
  value !== undefined && value.k === "number" && Number.isInteger(value.v) && value.v >= base && value.v < base + count;

function entryOf(object: ObjectOf, name: string): SValue | undefined {
  return object.entries.find(([entryName]) => entryName === name)?.[1];
}

function arrayOf(objects: ObjectTable, value: SValue | undefined): ArrayOf | null {
  const object = value?.k === "ref" ? objects[value.id] : undefined;
  return object?.k === "array" ? object : null;
}

function addLookup(lookup: Map<string, number>, value: SValue, index: number): void {
  const key = valueKey(value);
  if (!lookup.has(key)) lookup.set(key, index);
}

function integerLookup(count: number, base = 0): Map<string, number> {
  const lookup = new Map<string, number>();
  for (let index = 0; index < count; index++) addLookup(lookup, { k: "number", v: index + base }, index);
  return lookup;
}

// ------------------------------------------------------------ node objects

function neighborField(objects: ObjectTable, root: ObjectOf): string | null {
  for (const [name, value] of root.entries) {
    const list = NEIGHBOR_FIELD.test(name) ? arrayOf(objects, value) : null;
    const isNodeList = list?.items.every((item) => item.k === "ref" && objects[item.id]?.k === "object");
    if (isNodeList) return name;
  }
  return null;
}

/** Every neighbour of the root has a list under the same field (a real `Node` class, not e.g. edge records). */
function hasSameShape(objects: ObjectTable, root: ObjectOf, field: string): boolean {
  const list = arrayOf(objects, entryOf(root, field));
  return (list?.items ?? []).every((item) => {
    const target = item.k === "ref" ? objects[item.id] : undefined;
    return target?.k === "object" && arrayOf(objects, entryOf(target, field)) !== null;
  });
}

function nodeObjectLabel(objects: ObjectTable, object: ObjectOf): string {
  const value = pickNodeValue(object);
  return value ? nodeLabel(objects, value) : `#${object.id}`;
}

/** Primitive node values that identify exactly one node (so a path of plain values can find its node). */
function nodeObjectLookup(order: readonly ObjectOf[]): Map<string, number> {
  const lookup = new Map<string, number>();
  const ambiguous = new Set<string>();
  order.forEach((object, index) => {
    lookup.set(valueKey({ k: "ref", id: object.id }), index);
    const value = pickNodeValue(object);
    if (!value || value.k === "ref") return;
    const key = valueKey(value);
    if (lookup.has(key)) ambiguous.add(key);
    else lookup.set(key, index);
  });
  for (const key of ambiguous) lookup.delete(key);
  return lookup;
}

/** Breadth-first walk over a neighbours field, starting from `roots` in order. `cellsOf` adds pointer targets per node object id. */
function walkNodeObjects(objects: ObjectTable, roots: readonly ObjectOf[], field: string, cellsOf: (id: number) => PointerTarget[] = () => []): RawGraph {
  const order: ObjectOf[] = [];
  const indexOf = new Map<number, number>();
  const edges: RawEdge[] = [];
  let isTruncated = false;
  const admit = (target: ObjectOf): number | undefined => {
    const known = indexOf.get(target.id);
    if (known !== undefined) return known;
    if (order.length >= VIZ_LIMITS.maxGraphNodes) {
      isTruncated = true;
      return undefined;
    }
    indexOf.set(target.id, order.length);
    order.push(target);
    return order.length - 1;
  };
  for (const root of roots) admit(root);
  for (let cursor = 0; cursor < order.length; cursor++) {
    for (const item of arrayOf(objects, entryOf(order[cursor], field))?.items ?? []) {
      const target = item.k === "ref" ? objects[item.id] : undefined;
      const to = target?.k === "object" ? admit(target) : undefined;
      if (to !== undefined) edges.push({ from: cursor, to, weight: null });
    }
  }
  const nodes = order.map((object) => ({
    key: `o${object.id}`,
    label: nodeObjectLabel(objects, object),
    targets: [{ host: objectHost(object.id), cellKey: null }, ...cellsOf(object.id)],
  }));
  const isEdgelessAllowed = CERTAIN_NEIGHBOR_FIELD.test(field);
  return { format: "node-objects", nodes, edges, lookup: nodeObjectLookup(order), isTruncated, isEdgelessAllowed };
}

/** Breadth-first walk over a neighbours field from the root object. */
function buildNodeObjects(objects: ObjectTable, root: ObjectOf): RawGraph | null {
  const field = neighborField(objects, root);
  if (field === null || !hasSameShape(objects, root, field)) return null;
  return walkNodeObjects(objects, [root], field);
}

/** The node objects of an array of graph nodes (nulls allowed), or null when anything else is in there. */
function arrayNodeObjects(objects: ObjectTable, array: ArrayOf): ObjectOf[] | null {
  const found: ObjectOf[] = [];
  for (const item of array.items) {
    if (item.k === "null" || item.k === "undefined") continue;
    const object = item.k === "ref" ? objects[item.id] : undefined;
    if (object?.k !== "object") return null;
    found.push(object);
  }
  return found.length > 0 ? found : null;
}

/**
 * An array of node objects (`nodes[i] = { val, neighbors }`) as ONE graph: every item seeds the walk and each node
 * also answers to its array cell, so `nodes[i]` pointers light it. Only when the array holds every node it reaches
 * (it IS the graph) or its name says so: a BFS queue of nodes stays an array.
 */
function buildNodeArray(objects: ObjectTable, array: ArrayOf, hint: string): RawGraph | null {
  const roots = arrayNodeObjects(objects, array);
  const field = roots ? neighborField(objects, roots[0]) : null;
  if (!roots || field === null || !roots.every((root) => arrayOf(objects, entryOf(root, field)) !== null)) return null;
  const cells = new Map<number, PointerTarget[]>();
  array.items.forEach((item, index) => {
    if (item.k !== "ref") return;
    const list = cells.get(item.id) ?? [];
    list.push({ host: objectHost(array.id), cellKey: String(index) });
    cells.set(item.id, list);
  });
  const raw = walkNodeObjects(objects, roots, field, (id) => cells.get(id) ?? []);
  const isWholeGraph = !raw.isTruncated && raw.nodes.length === new Set(roots.map((root) => root.id)).size;
  return isWholeGraph || NODE_ARRAY_NAME.test(hint) ? raw : null;
}

/** Label of a graph node object (its value field), for drawing it as a single node chip. */
export function graphNodeLabel(objects: ObjectTable, objectId: number): string | null {
  const object = objects[objectId];
  if (object?.k !== "object") return null;
  const field = neighborField(objects, object);
  return field !== null && hasSameShape(objects, object, field) ? nodeObjectLabel(objects, object) : null;
}

// ------------------------------------------------------------------- keyed

interface KeyedEntry { keyValue: IdValue; cellKey: string; items: IdValue[] }

/** Items of an array/set of node ids, or null when anything else is in there. */
function idItems(objects: ObjectTable, value: SValue): IdValue[] | null {
  const container = value.k === "ref" ? objects[value.id] : undefined;
  if (container?.k !== "array" && container?.k !== "set") return null;
  return container.items.every(isIdValue) ? (container.items as IdValue[]) : null;
}

function keyedEntries(objects: ObjectTable, root: ObjectOf | MapOf): KeyedEntry[] | null {
  const pairs: [SValue, SValue][] = root.k === "map" ? root.entries : root.entries.map(([name, value]): [SValue, SValue] => [{ k: "string", v: name }, value]);
  const entries: KeyedEntry[] = [];
  for (const [key, value] of pairs) {
    const items = idItems(objects, value);
    if (!isIdValue(key) || !items) return null;
    entries.push({ keyValue: key, cellKey: root.k === "map" ? valueKey(key) : String(key.v), items });
  }
  return entries;
}

/** Lookup tokens of a node id. Plain-object keys are strings, so `{1: [2]}` also answers to the number 2. */
function idTokens(root: ObjectOf | MapOf, value: IdValue): string[] {
  if (root.k === "map") return [valueKey(value)];
  const text = String(value.v);
  const tokens = [valueKey({ k: "string", v: text })];
  if (String(Number(text)) === text) tokens.push(valueKey({ k: "number", v: Number(text) }));
  return tokens;
}

function buildKeyed(objects: ObjectTable, root: ObjectOf | MapOf): RawGraph | null {
  const entries = keyedEntries(objects, root);
  if (!entries || entries.length === 0) return null;
  const keyTokens = new Set(entries.map((entry) => idTokens(root, entry.keyValue)[0]));
  const items = entries.flatMap((entry) => entry.items);
  const matching = items.filter((item) => keyTokens.has(idTokens(root, item)[0])).length;
  if (items.length > 0 && matching < items.length * KEYED_MIN_MATCH_RATIO) return null;

  const nodes: GraphNode[] = [];
  const lookup = new Map<string, number>();
  let isTruncated = false;
  /** Node index of an id, adding the node on first sight (items that are not keys get a node without a cell). */
  const admit = (value: IdValue, cellKey: string | null): number | null => {
    const [token, ...aliases] = idTokens(root, value);
    const known = lookup.get(token);
    if (known !== undefined) return known;
    if (nodes.length >= VIZ_LIMITS.maxGraphNodes) {
      isTruncated = true;
      return null;
    }
    const targets = cellKey === null ? [] : [{ host: objectHost(root.id), cellKey }];
    nodes.push({ key: `k${token}`, label: nodeLabel(objects, value), targets });
    for (const key of [token, ...aliases]) lookup.set(key, nodes.length - 1);
    return nodes.length - 1;
  };
  for (const entry of entries) admit(entry.keyValue, entry.cellKey);
  const edges: RawEdge[] = [];
  for (const entry of entries) {
    const from = admit(entry.keyValue, entry.cellKey);
    for (const item of entry.items) {
      const to = from === null ? null : admit(item, null);
      if (from !== null && to !== null) edges.push({ from, to, weight: null });
    }
  }
  return { format: "keyed", nodes, edges, lookup, isTruncated };
}

// ------------------------------------------------------------------- arrays

/** Rows of an array of arrays (every row complete), or null. */
function arrayRows(objects: ObjectTable, array: ArrayOf): ArrayOf[] | null {
  if (array.length === 0 || array.items.length !== array.length) return null;
  const rows: ArrayOf[] = [];
  for (const item of array.items) {
    const row = arrayOf(objects, item);
    if (!row || row.items.length !== row.length) return null;
    rows.push(row);
  }
  return rows;
}

/** 0 for "no edge" (false, 0, null, Infinity), the number for anything else; NaN when the cell cannot be part of a matrix. */
function readCell(value: SValue): number {
  switch (value.k) {
    case "boolean":
      return value.v ? 1 : 0;
    case "number":
      if (Number.isNaN(value.v)) return NaN;
      return Number.isFinite(value.v) ? value.v : 0;
    case "null":
    case "undefined":
      return 0;
    default:
      return NaN;
  }
}

function buildMatrix(objects: ObjectTable, array: ArrayOf, rows: ArrayOf[]): RawGraph | null {
  const size = rows.length;
  if (size < MIN_MATRIX_SIZE || rows.some((row) => row.length !== size)) return null;
  const cells = rows.map((row) => row.items.map(readCell));
  if (cells.some((row) => row.some(Number.isNaN))) return null;
  const isBinary = cells.every((row) => row.every((cell) => cell === 0 || cell === 1));
  // A table of weights/values only reads as a graph when no node links to itself (a zero diagonal), like a distance matrix.
  if (!isBinary && cells.some((row, index) => row[index] !== 0)) return null;
  const shown = Math.min(size, VIZ_LIMITS.maxGraphNodes);
  const nodes: GraphNode[] = [];
  const edges: RawEdge[] = [];
  for (let i = 0; i < shown; i++) {
    const targets = [{ host: objectHost(array.id), cellKey: String(i) }, ...rows.map((row) => ({ host: objectHost(row.id), cellKey: String(i) }))];
    nodes.push({ key: `n${i}`, label: String(i), targets });
    for (let j = 0; j < shown; j++) {
      if (cells[i][j] !== 0) edges.push({ from: i, to: j, weight: isBinary ? null : nodeLabel(objects, { k: "number", v: cells[i][j] }) });
    }
  }
  return { format: "adjacency-matrix", nodes, edges, lookup: integerLookup(shown), isTruncated: size > shown };
}

/** Numbers first (ascending), then strings (ascending). */
function compareIds(a: IdValue, b: IdValue): number {
  if (a.k !== b.k) return a.k === "number" ? -1 : 1;
  if (a.v === b.v) return 0;
  return a.v < b.v ? -1 : 1;
}

function edgeWeight(objects: ObjectTable, value: SValue | undefined): string | null {
  return value && (value.k === "number" || value.k === "string") ? nodeLabel(objects, value) : null;
}

function buildEdgeList(objects: ObjectTable, rows: ArrayOf[]): RawGraph | null {
  const endpoints = new Map<string, IdValue>();
  const listed: { from: IdValue; to: IdValue; weight: string | null }[] = [];
  for (const row of rows) {
    const [from, to, weight] = row.items;
    const isWeightOk = weight === undefined || weight.k !== "ref";
    if (!EDGE_ROW_LENGTHS.includes(row.length) || !isIdValue(from) || !isIdValue(to) || !isWeightOk) return null;
    endpoints.set(valueKey(from), from);
    endpoints.set(valueKey(to), to);
    listed.push({ from, to, weight: edgeWeight(objects, weight) });
  }
  const sorted = [...endpoints.values()].sort(compareIds).slice(0, VIZ_LIMITS.maxGraphNodes);
  const lookup = new Map(sorted.map((value, index) => [valueKey(value), index] as const));
  const used = new Set<string>(); // 1 and "1" print the same: the second falls back to valueKey
  const nodes = sorted.map((value) => {
    const key = used.has(`n${String(value.v)}`) ? `n${valueKey(value)}` : `n${String(value.v)}`;
    used.add(key);
    return { key, label: nodeLabel(objects, value), targets: [] };
  });
  const edges: RawEdge[] = [];
  for (const edge of listed) {
    const from = lookup.get(valueKey(edge.from));
    const to = lookup.get(valueKey(edge.to));
    if (from !== undefined && to !== undefined) edges.push({ from, to, weight: edge.weight });
  }
  return { format: "edge-list", nodes, edges, lookup, isTruncated: endpoints.size > sorted.length };
}

interface Neighbor { to: number; weight: string | null }

/** A plain vertex number, or a `[vertex, weight]` pair; `to` is the node index (vertex number minus `base`). */
function readNeighbor(objects: ObjectTable, item: SValue, count: number, base: number): Neighbor | null {
  if (isIndexValue(item, count, base)) return { to: item.v - base, weight: null };
  const pair = arrayOf(objects, item);
  if (!pair || pair.length !== PAIR_LENGTH || pair.items.length !== PAIR_LENGTH) return null;
  const [to, weight] = pair.items;
  const isWeight = weight.k === "number" || weight.k === "string";
  return isIndexValue(to, count, base) && isWeight ? { to: to.v - base, weight: nodeLabel(objects, weight) } : null;
}

function readAdjacencyList(objects: ObjectTable, array: ArrayOf, rows: ArrayOf[], isStrict: boolean, base: number): RawGraph | null {
  const count = rows.length;
  const shown = Math.min(count, VIZ_LIMITS.maxGraphNodes);
  const edges: RawEdge[] = [];
  let isWeighted: boolean | null = null;
  for (let from = 0; from < count; from++) {
    const targets = new Set<number>();
    for (const item of rows[from].items) {
      const neighbor = readNeighbor(objects, item, count, base);
      if (!neighbor || (isWeighted !== null && isWeighted !== (neighbor.weight !== null))) return null;
      if (isStrict && targets.has(neighbor.to)) return null;
      targets.add(neighbor.to);
      isWeighted = neighbor.weight !== null;
      if (from < shown && neighbor.to < shown) edges.push({ from, to: neighbor.to, weight: neighbor.weight });
    }
  }
  const nodes = Array.from({ length: shown }, (_, index) => ({
    key: `n${index + base}`,
    label: String(index + base),
    targets: [{ host: objectHost(array.id), cellKey: String(index) }],
  }));
  return { format: "adjacency-list", nodes, edges, lookup: integerLookup(shown, base), isTruncated: count > shown };
}

/**
 * Row i lists the neighbours of vertex i. Vertices are 0..n-1, or 1..n when a row mentions n (LeetCode-style
 * 1-indexed lists such as clone-graph's `[[2, 4], [1, 3], ...]`). `isStrict` rejects rows that repeat a vertex:
 * a zero-filled table is not a graph unless the name says so.
 */
function buildAdjacencyList(objects: ObjectTable, array: ArrayOf, rows: ArrayOf[], isStrict: boolean): RawGraph | null {
  return readAdjacencyList(objects, array, rows, isStrict, 0) ?? readAdjacencyList(objects, array, rows, isStrict, 1);
}

type Candidate = () => RawGraph | null;

/** Formats an array of arrays could be, best guess first: variable name, then shape (square -> matrix, 2-3 columns -> edges). */
function arrayCandidates(objects: ObjectTable, array: ArrayOf, hint: string): Candidate[] {
  const rows = arrayRows(objects, array);
  if (!rows) return [() => buildNodeArray(objects, array, hint)];
  const isSquare = rows.every((row) => row.length === rows.length);
  const matrix: Candidate = () => buildMatrix(objects, array, rows);
  const list: Candidate = () => buildAdjacencyList(objects, array, rows, !GRAPH_NAME.test(hint));
  const edges: Candidate = () => (isSquare && !EDGE_NAME.test(hint) ? null : buildEdgeList(objects, rows));
  if (EDGE_NAME.test(hint)) return [edges, matrix, list];
  return GRAPH_NAME.test(hint) ? [matrix, list, edges] : [matrix, edges, list];
}

// ------------------------------------------------------------------ result

function undirectedEdges(edges: readonly RawEdge[]): RawEdge[] {
  const seen = new Map<string, RawEdge>();
  for (const edge of edges) {
    const [from, to] = edge.from <= edge.to ? [edge.from, edge.to] : [edge.to, edge.from];
    if (!seen.has(`${from}>${to}`)) seen.set(`${from}>${to}`, { from, to, weight: edge.weight });
  }
  return [...seen.values()];
}

/** Drops repeated edges, folds mirrored pairs of an undirected graph into one edge, and applies the edge cap. */
function finishGraph(raw: RawGraph, isEdgelessAllowed: boolean): GraphModel | null {
  const unique = new Map<string, RawEdge>();
  for (const edge of raw.edges) if (!unique.has(`${edge.from}>${edge.to}`)) unique.set(`${edge.from}>${edge.to}`, edge);
  const isDirected = [...unique.values()].some((edge) => !unique.has(`${edge.to}>${edge.from}`));
  const edges = isDirected ? [...unique.values()] : undirectedEdges([...unique.values()]);
  if (raw.nodes.length === 0 || (edges.length === 0 && !isEdgelessAllowed)) return null;
  const kept: GraphEdge[] = edges.slice(0, VIZ_LIMITS.maxGraphEdges).map((edge) => ({ key: `${edge.from}>${edge.to}`, ...edge }));
  return {
    format: raw.format,
    nodes: raw.nodes,
    edges: kept,
    isDirected,
    isTruncated: raw.isTruncated || edges.length > kept.length,
    nodeIndexOfValue: (value) => raw.lookup.get(valueKey(value)) ?? null,
  };
}

function candidatesFor(objects: ObjectTable, object: SObject, hint: string): Candidate[] {
  switch (object.k) {
    case "object":
      return [() => buildNodeObjects(objects, object), () => buildKeyed(objects, object)];
    case "map":
      return [() => buildKeyed(objects, object)];
    case "array":
      return arrayCandidates(objects, object, hint);
    default:
      return [];
  }
}

/**
 * Reads an object as a node-link graph: node objects with neighbour lists, a map of key -> neighbours, an adjacency
 * matrix, an edge list or an adjacency list. `nameHint` (the variable name) decides between look-alike array shapes.
 * Null when the object is not graph-shaped; a graph with no edges only counts when the name says "graph".
 */
export function buildGraphModel(objects: ObjectTable, objectId: number, nameHint?: string): GraphModel | null {
  const object = objects[objectId];
  if (!object) return null;
  const hint = nameHint ?? "";
  for (const candidate of candidatesFor(objects, object, hint)) {
    const raw = candidate();
    const model = raw ? finishGraph(raw, GRAPH_NAME.test(hint) || raw.isEdgelessAllowed === true) : null;
    if (model) return model;
  }
  return null;
}

/** An array of graph node objects that reads as one graph (see buildNodeArray). */
export function isNodeArrayGraph(objects: ObjectTable, objectId: number, nameHint?: string): boolean {
  const object = objects[objectId];
  return object?.k === "array" && arrayRows(objects, object) === null && isGraphShaped(objects, objectId, nameHint);
}

export function isGraphShaped(objects: ObjectTable, objectId: number, nameHint?: string): boolean {
  return buildGraphModel(objects, objectId, nameHint) !== null;
}
