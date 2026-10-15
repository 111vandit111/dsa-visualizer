"use client";

import { useMemo } from "react";
import type { SObject, SValue } from "@/lib/tracer/types";
import { VIZ_LIMITS } from "@/lib/viz/constants";
import { objectStatus } from "@/lib/viz/diff";
import { nodeLabel, summarizeValue } from "@/lib/viz/format";
import { layoutNaryTree } from "@/lib/viz/nary-tree-layout";
import { objectHost, type StepPaths } from "@/lib/viz/overlay-types";
import { resolvePathNodes } from "@/lib/viz/paths";
import { buildLevelOrderShape, buildNaryTreeShape, buildObjectTreeShape, hasChildrenShape, itemsOf, type TreeShapeNode } from "@/lib/viz/structures";
import { layoutBinaryTree, type TreeLayout } from "@/lib/viz/tree-layout";
import type { ObjectTable } from "@/lib/viz/types";
import type { RendererProps } from "./renderer-types";
import { EmptyChip, MoreChip } from "./small-chips";
import { TreeCanvas, type CanvasEdge, type CanvasNode } from "./tree-canvas";
import { useViz } from "./viz-context";

/** A tree of any supported shape, reduced to what the canvas needs. */
interface Shape {
  nodes: TreeShapeNode[];
  /** childLists[i] = indices of node i's children, in order. */
  childLists: number[][];
  /** edgeLabels[i][k] = label of the edge to childLists[i][k]. */
  edgeLabels: (string | null)[][];
  layout: TreeLayout;
  isTruncated: boolean;
  isNary: boolean;
  /** Id of the level-order array the nodes come from (their nodes have no object id), else null. */
  arrayId: number | null;
}

function binaryShape(shape: ReturnType<typeof buildObjectTreeShape>, arrayId: number | null): Shape {
  const childLists = shape.children.map((pair) => pair.filter((child): child is number => child !== null));
  return {
    nodes: shape.nodes,
    childLists,
    edgeLabels: childLists.map((list) => list.map(() => null)),
    layout: layoutBinaryTree(shape.nodes.length, (index) => shape.children[index]),
    isTruncated: shape.isTruncated,
    isNary: false,
    arrayId,
  };
}

function shapeOf(objects: ObjectTable, object: SObject): Shape {
  if (object.k !== "object") return binaryShape(buildLevelOrderShape(itemsOf(object).items, VIZ_LIMITS.maxTreeNodes), object.id);
  if (!hasChildrenShape(objects, object)) return binaryShape(buildObjectTreeShape(objects, object.id, VIZ_LIMITS.maxTreeNodes), null);
  const shape = buildNaryTreeShape(objects, object.id, VIZ_LIMITS.maxTreeNodes);
  return {
    nodes: shape.nodes,
    childLists: shape.children,
    edgeLabels: shape.edgeLabels,
    layout: layoutNaryTree(shape.nodes.length, (index) => shape.children[index]),
    isTruncated: shape.isTruncated,
    isNary: true,
    arrayId: null,
  };
}

/** Position of a level-order node in its array (`i7` -> 7). */
function positionOf(node: TreeShapeNode): number {
  return Number(node.key.slice(1));
}

/** Which tree node a path/reach point names: an object reference, or (level-order arrays) a position. */
function nodeIndexOf(shape: Shape): (point: readonly SValue[]) => number | null {
  const byKey = new Map<string, number>();
  shape.nodes.forEach((node, index) => {
    if (node.objectId !== null) byKey.set(`o${node.objectId}`, index);
    else if (shape.arrayId !== null) byKey.set(`i${positionOf(node)}`, index);
  });
  return (point) => {
    const value = point[0];
    if (value?.k === "ref") return byKey.get(`o${value.id}`) ?? null;
    if (value?.k === "number" && shape.arrayId !== null) return byKey.get(`i${value.v}`) ?? null;
    return null;
  };
}

interface Overlays {
  nodeSlots: number[][];
  edgeSlots: Map<string, number[]>;
  isReached: boolean[];
}

const addSlot = (slots: number[], slot: number) => {
  if (!slots.includes(slot)) slots.push(slot);
};

/** Paths -> per-node and per-edge slots; reach sets -> reached nodes. Only edges the tree really has are lit. */
function overlaysOf(shape: Shape, paths: StepPaths): Overlays {
  const resolve = nodeIndexOf(shape);
  const nodeSlots: number[][] = shape.nodes.map(() => []);
  const edgeSlots = new Map<string, number[]>();
  const edgeKeys = new Map<string, string>();
  shape.childLists.forEach((list, parent) => {
    for (const child of list) edgeKeys.set(`${parent}>${child}`, `${shape.nodes[parent].key}>${shape.nodes[child].key}`);
  });
  for (const sequence of paths.sequences) {
    const stops = resolvePathNodes(sequence.points, resolve);
    stops.forEach((node, position) => {
      addSlot(nodeSlots[node], sequence.slot);
      const previous = stops[position - 1];
      const key = previous === undefined ? undefined : (edgeKeys.get(`${previous}>${node}`) ?? edgeKeys.get(`${node}>${previous}`));
      if (key === undefined) return;
      const slots = edgeSlots.get(key) ?? [];
      addSlot(slots, sequence.slot);
      edgeSlots.set(key, slots);
    });
  }
  const isReached = shape.nodes.map(() => false);
  for (const set of paths.reached) {
    for (const point of set.points) {
      const index = resolve(point);
      if (index !== null) isReached[index] = true;
    }
  }
  return { nodeSlots, edgeSlots, isReached };
}

function edgesOf(shape: Shape, overlays: Overlays): CanvasEdge[] {
  return shape.childLists.flatMap((list, parent) =>
    list.map((child, order) => {
      const fromKey = shape.nodes[parent].key;
      const toKey = shape.nodes[child].key;
      const key = `${fromKey}>${toKey}`;
      return { key, fromKey, toKey, label: shape.edgeLabels[parent][order], pathSlots: overlays.edgeSlots.get(key) };
    }),
  );
}

/** Binary tree (left/right or level-order array) or n-ary tree/trie (`children`): tidy layout, glowing edges, pointers and DFS paths. */
export function TreeRenderer({ object }: RendererProps) {
  const { objects, diff, pointers, paths } = useViz();
  const shape = useMemo(() => shapeOf(objects, object), [objects, object]);
  const overlays = useMemo(() => overlaysOf(shape, paths), [shape, paths]);

  const nodePointers = (node: TreeShapeNode) => {
    if (node.objectId !== null) return pointers.at(objectHost(node.objectId), null);
    return shape.arrayId === null ? [] : pointers.at(objectHost(shape.arrayId), String(positionOf(node)));
  };

  if (shape.nodes.length === 0) {
    return (
      <div data-testid="renderer-tree">
        <EmptyChip label="empty tree" />
      </div>
    );
  }
  const nodes: CanvasNode[] = shape.nodes.map((node, index) => ({
    key: node.key,
    label: node.value === null && shape.isNary ? "" : nodeLabel(objects, node.value),
    title: node.value ? summarizeValue(objects, node.value) : "node",
    x: shape.layout.positions[index].x,
    depth: shape.layout.positions[index].depth,
    status: node.objectId === null ? null : objectStatus(diff, node.objectId),
    relation: null,
    isEmphasized: index === 0,
    pointers: nodePointers(node),
    pathSlots: overlays.nodeSlots[index],
    isReached: overlays.isReached[index],
    color: node.color,
  }));
  return (
    <div data-testid="renderer-tree" className="space-y-1.5">
      <TreeCanvas
        nodes={nodes}
        edges={edgesOf(shape, overlays)}
        width={shape.layout.width}
        levelCount={shape.layout.levelCount}
        tone="violet"
        ariaLabel={`${shape.isNary ? "Tree" : "Binary tree"} of ${nodes.length} nodes`}
      />
      {shape.isTruncated ? <MoreChip count={1} className="w-fit" /> : null}
    </div>
  );
}
