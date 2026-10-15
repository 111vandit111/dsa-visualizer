import type { SObject, SValue } from "@/lib/tracer/types";
import type { ChildPair } from "./tree-layout";
import type { ObjectTable } from "./types";

type ObjectOf = Extract<SObject, { k: "object" }>;

const NODE_VALUE_FIELDS = ["val", "value", "key", "data", "id", "name"] as const;
const NEXT_FIELD = "next";
const PREV_FIELD = "prev";
const LEFT_FIELD = "left";
const RIGHT_FIELD = "right";

function entryOf(object: ObjectOf, name: string): SValue | undefined {
  return object.entries.find(([entryName]) => entryName === name)?.[1];
}

function resolveObject(objects: ObjectTable, value: SValue | undefined): ObjectOf | null {
  if (value?.k !== "ref") return null;
  const target = objects[value.id];
  return target?.k === "object" ? target : null;
}

/** The value a list/tree node is labelled with: `val`, `value`, ... else the first primitive field. */
export function pickNodeValue(object: ObjectOf): SValue | null {
  for (const name of NODE_VALUE_FIELDS) {
    const value = entryOf(object, name);
    if (value) return value;
  }
  const primitive = object.entries.find(([name, value]) => value.k !== "ref" && name !== NEXT_FIELD && name !== LEFT_FIELD && name !== RIGHT_FIELD);
  return primitive ? primitive[1] : null;
}

const COLOR_FIELD = "color";
const KEYS_FIELD = "keys";

function primitiveText(value: SValue): string | null {
  if (value.k === "string" || value.k === "number" || value.k === "boolean" || value.k === "bigint") return String(value.v);
  return null;
}

/** Binary tree label: the node value, suffixed with a primitive `color` field (red-black trees) as "20:R". */
function binaryNodeValue(object: ObjectOf): SValue | null {
  const value = pickNodeValue(object);
  const color = entryOf(object, COLOR_FIELD);
  const colorText = color ? primitiveText(color) : null;
  const valueText = value ? primitiveText(value) : null;
  if (colorText === null || valueText === null) return value;
  return { k: "string", v: `${valueText}:${colorText}` };
}

export type NodeColor = "red" | "black";

const RED_VALUES = new Set(["r", "red"]);
const BLACK_VALUES = new Set(["b", "black"]);

/** Red-black colour of a node: a primitive `color` field of "R"/"red" or "B"/"black" (any case), else null. */
export function nodeColor(object: ObjectOf): NodeColor | null {
  const color = entryOf(object, COLOR_FIELD);
  const text = color?.k === "string" ? color.v.trim().toLowerCase() : null;
  if (text === null) return null;
  if (RED_VALUES.has(text)) return "red";
  return BLACK_VALUES.has(text) ? "black" : null;
}

export type ChainEnd = "null" | "cycle" | "truncated" | "unknown";

export interface ListChain {
  /** `isLinkedBack`: the node's `prev` points at the previous node of the chain (doubly linked). */
  nodes: { objectId: number; value: SValue | null; isLinkedBack: boolean }[];
  end: ChainEnd;
  /** Object id the chain loops back to (end === "cycle"). */
  cycleTo: number | null;
}

/** Follows `next` pointers from `rootId`; stops at null, a revisited node, a missing object, or `maxNodes`. */
export function collectListChain(objects: ObjectTable, rootId: number, maxNodes: number): ListChain {
  const nodes: ListChain["nodes"] = [];
  const visited = new Set<number>();
  let current: ObjectOf | null = resolveObject(objects, { k: "ref", id: rootId });
  let end: ChainEnd = "unknown";
  let cycleTo: number | null = null;
  while (current) {
    if (nodes.length >= maxNodes) {
      end = "truncated";
      break;
    }
    visited.add(current.id);
    const previous = nodes[nodes.length - 1];
    const back = entryOf(current, PREV_FIELD);
    nodes.push({ objectId: current.id, value: pickNodeValue(current), isLinkedBack: !!previous && back?.k === "ref" && back.id === previous.objectId });
    const next: SValue | undefined = entryOf(current, NEXT_FIELD);
    if (next === undefined || next.k !== "ref") {
      end = next?.k === "null" ? "null" : "unknown";
      break;
    }
    if (visited.has(next.id)) {
      end = "cycle";
      cycleTo = next.id;
      break;
    }
    current = resolveObject(objects, next);
    if (!current) end = "unknown";
  }
  return { nodes, end, cycleTo };
}

export interface TreeShapeNode {
  /** Stable React key. */
  key: string;
  /** Object id when the node is an object (for identity animation), else null. */
  objectId: number | null;
  value: SValue | null;
  /** Red-black colour (binary object trees only). */
  color?: NodeColor | null;
}

export interface TreeShape {
  nodes: TreeShapeNode[];
  /** children[i] = [left, right] indices into `nodes`. */
  children: ChildPair[];
  isTruncated: boolean;
}

function childId(object: ObjectOf, field: string): number | null {
  const value = entryOf(object, field);
  return value?.k === "ref" ? value.id : null;
}

/** Breadth-first walk over `left`/`right` pointers from `rootId`. Each object appears once (cycles/sharing ignored). */
export function buildObjectTreeShape(objects: ObjectTable, rootId: number, maxNodes: number): TreeShape {
  const nodes: TreeShapeNode[] = [];
  const children: [number | null, number | null][] = [];
  const indexOf = new Map<number, number>();
  const queue: ObjectOf[] = [];
  let isTruncated = false;

  const admit = (id: number | null): number | null => {
    if (id === null || indexOf.has(id)) return null;
    const target = resolveObject(objects, { k: "ref", id });
    if (!target) return null;
    if (nodes.length >= maxNodes) {
      isTruncated = true;
      return null;
    }
    indexOf.set(id, nodes.length);
    nodes.push({ key: `o${id}`, objectId: id, value: binaryNodeValue(target), color: nodeColor(target) });
    children.push([null, null]);
    queue.push(target);
    return nodes.length - 1;
  };

  admit(rootId);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const object = queue[cursor];
    const slot = indexOf.get(object.id) as number;
    children[slot] = [admit(childId(object, LEFT_FIELD)), admit(childId(object, RIGHT_FIELD))];
  }
  return { nodes, children, isTruncated };
}

export interface NaryTreeShape {
  nodes: TreeShapeNode[];
  /** children[i] = indices into `nodes` of node i's children, in order. */
  children: number[][];
  /** edgeLabels[i][k] = label of the edge to children[i][k]: trie char / map key, else null. */
  edgeLabels: (string | null)[][];
  isTruncated: boolean;
}

const CHILDREN_FIELD = "children";

interface ChildLink {
  id: number;
  label: string | null;
}

function keyLabel(key: SValue): string {
  return key.k === "ref" ? "" : String("v" in key ? key.v : key.k);
}

/** Child references of a node: `children` as an array of refs, or an object/Map of key -> ref (key becomes the edge label). */
function childLinks(objects: ObjectTable, object: ObjectOf): ChildLink[] {
  const container = resolveChildren(objects, object);
  if (!container) return [];
  const links: ChildLink[] = [];
  if (container.k === "array") {
    for (const item of container.items) if (item.k === "ref") links.push({ id: item.id, label: null });
  } else if (container.k === "object") {
    for (const [name, value] of container.entries) if (value.k === "ref") links.push({ id: value.id, label: name });
  } else if (container.k === "map") {
    for (const [key, value] of container.entries) if (value.k === "ref") links.push({ id: value.id, label: keyLabel(key) });
  }
  return links;
}

function resolveChildren(objects: ObjectTable, object: ObjectOf): SObject | null {
  const value = entryOf(object, CHILDREN_FIELD);
  if (value?.k !== "ref") return null;
  return objects[value.id] ?? null;
}

/** B-tree style nodes: a `keys` array of primitives is shown joined, e.g. "20,50,80". */
function keysLabel(objects: ObjectTable, object: ObjectOf): SValue | null {
  const value = entryOf(object, KEYS_FIELD);
  if (value?.k !== "ref") return null;
  const keys = objects[value.id];
  if (keys?.k !== "array") return null;
  const parts = keys.items.map(primitiveText);
  if (parts.some((part) => part === null)) return null;
  return { k: "string", v: parts.join(",") };
}

/** Label of an n-ary node: a named value field, else (arrays of children) the first primitive field; trie nodes without one have none. */
function naryNodeValue(objects: ObjectTable, object: ObjectOf, isKeyed: boolean): SValue | null {
  const keys = keysLabel(objects, object);
  if (keys !== null) return keys;
  if (isKeyed && !NODE_VALUE_FIELDS.some((name) => entryOf(object, name))) return null;
  return pickNodeValue(object);
}

/** Breadth-first walk over `children` from `rootId` (array of refs, or object/Map key -> ref). Each object appears once. */
export function buildNaryTreeShape(objects: ObjectTable, rootId: number, maxNodes: number): NaryTreeShape {
  const nodes: TreeShapeNode[] = [];
  const children: number[][] = [];
  const edgeLabels: (string | null)[][] = [];
  const indexOf = new Map<number, number>();
  const queue: ObjectOf[] = [];
  let isTruncated = false;

  const admit = (id: number): number | null => {
    if (indexOf.has(id)) return null;
    const target = resolveObject(objects, { k: "ref", id });
    if (!target) return null;
    if (nodes.length >= maxNodes) {
      isTruncated = true;
      return null;
    }
    indexOf.set(id, nodes.length);
    const kind = resolveChildren(objects, target)?.k;
    const isKeyed = kind === "object" || kind === "map";
    nodes.push({ key: `o${id}`, objectId: id, value: naryNodeValue(objects, target, isKeyed) });
    children.push([]);
    edgeLabels.push([]);
    queue.push(target);
    return nodes.length - 1;
  };

  admit(rootId);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const object = queue[cursor];
    const slot = indexOf.get(object.id) as number;
    for (const link of childLinks(objects, object)) {
      const child = admit(link.id);
      if (child === null) continue;
      children[slot].push(child);
      edgeLabels[slot].push(link.label);
    }
  }
  return { nodes, children, edgeLabels, isTruncated };
}

function isObjectRef(objects: ObjectTable, value: SValue): boolean {
  return value.k === "ref" && objects[value.id]?.k === "object";
}

/** True for an object whose `children` is an array of node refs (or empty), or an object/Map whose values are node refs (trie). */
export function hasChildrenShape(objects: ObjectTable, object: SObject): boolean {
  if (object.k !== "object") return false;
  const container = resolveChildren(objects, object);
  if (!container) return false;
  switch (container.k) {
    case "array":
      return container.items.every((item) => isObjectRef(objects, item));
    case "object":
      return container.entries.every(([, value]) => isObjectRef(objects, value));
    case "map":
      return container.entries.every(([, value]) => isObjectRef(objects, value));
    default:
      return false;
  }
}

/** LeetCode level-order array (`[3, 9, 20, null, null, 15, 7]`): null items are missing nodes and have no children. */
export function buildLevelOrderShape(items: readonly SValue[], maxNodes: number): TreeShape {
  const nodes: TreeShapeNode[] = [];
  const children: [number | null, number | null][] = [];
  /** Queue of node indices still waiting for their children. */
  const parents: number[] = [];
  const isPresent = (item: SValue) => item.k !== "null" && item.k !== "undefined";
  let isTruncated = false;

  if (items.length === 0 || !isPresent(items[0])) return { nodes, children, isTruncated };
  nodes.push({ key: "i0", objectId: null, value: items[0] });
  children.push([null, null]);
  parents.push(0);
  let cursor = 1;
  for (let head = 0; head < parents.length && cursor < items.length; head++) {
    const slots: (number | null)[] = [null, null];
    for (let side = 0; side < 2 && cursor < items.length; side++) {
      const position = cursor++;
      if (!isPresent(items[position])) continue;
      if (nodes.length >= maxNodes) {
        isTruncated = true;
        continue;
      }
      slots[side] = nodes.length;
      nodes.push({ key: `i${position}`, objectId: null, value: items[position] });
      children.push([null, null]);
      parents.push(nodes.length - 1);
    }
    children[parents[head]] = [slots[0], slots[1]];
  }
  return { nodes, children, isTruncated };
}

export interface ItemList {
  items: readonly SValue[];
  /** Real size; larger than items.length when the container was truncated. */
  total: number;
}

/** Items of the kinds drawn as a flat list (array, heap, set); empty for keyed containers. */
export function itemsOf(object: SObject): ItemList {
  switch (object.k) {
    case "array":
      return { items: object.items, total: object.length };
    case "heap":
    case "set":
      return { items: object.items, total: object.size };
    case "object":
    case "map":
      return { items: [], total: 0 };
  }
}

/** Unique React keys for list items: object identity for containers (so they animate when moved), position otherwise. */
export function itemKeys(items: readonly SValue[]): string[] {
  const used = new Set<string>();
  return items.map((item, index) => {
    const base = item.k === "ref" ? `o${item.id}` : `i${index}`;
    const key = used.has(base) ? `${base}-${index}` : base;
    used.add(key);
    return key;
  });
}
