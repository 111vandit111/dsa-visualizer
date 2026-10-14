import type { SObject, SValue } from "@/lib/tracer/types";
import type { ChildPair } from "./tree-layout";
import type { ObjectTable } from "./types";

type ObjectOf = Extract<SObject, { k: "object" }>;

const NODE_VALUE_FIELDS = ["val", "value", "key", "data", "id", "name"] as const;
const NEXT_FIELD = "next";
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

export type ChainEnd = "null" | "cycle" | "truncated" | "unknown";

export interface ListChain {
  nodes: { objectId: number; value: SValue | null }[];
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
    nodes.push({ objectId: current.id, value: pickNodeValue(current) });
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
    nodes.push({ key: `o${id}`, objectId: id, value: pickNodeValue(target) });
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
