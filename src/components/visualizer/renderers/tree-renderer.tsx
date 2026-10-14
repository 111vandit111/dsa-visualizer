"use client";

import { useMemo } from "react";
import { VIZ_LIMITS } from "@/lib/viz/constants";
import { objectStatus } from "@/lib/viz/diff";
import { nodeLabel, summarizeValue } from "@/lib/viz/format";
import { buildLevelOrderShape, buildObjectTreeShape, itemsOf, type TreeShape } from "@/lib/viz/structures";
import { layoutBinaryTree } from "@/lib/viz/tree-layout";
import type { ObjectTable } from "@/lib/viz/types";
import type { SObject } from "@/lib/tracer/types";
import type { RendererProps } from "./renderer-types";
import { EmptyChip, MoreChip } from "./small-chips";
import { TreeCanvas, type CanvasEdge, type CanvasNode } from "./tree-canvas";
import { useViz } from "./viz-context";

function shapeOf(objects: ObjectTable, object: SObject): TreeShape {
  if (object.k === "object") return buildObjectTreeShape(objects, object.id, VIZ_LIMITS.maxTreeNodes);
  return buildLevelOrderShape(itemsOf(object).items, VIZ_LIMITS.maxTreeNodes);
}

function shapeEdges(shape: TreeShape): CanvasEdge[] {
  const edges: CanvasEdge[] = [];
  shape.children.forEach((pair, parent) => {
    for (const child of pair) {
      if (child === null) continue;
      const fromKey = shape.nodes[parent].key;
      const toKey = shape.nodes[child].key;
      edges.push({ key: `${fromKey}>${toKey}`, fromKey, toKey });
    }
  });
  return edges;
}

/** Binary tree from `left`/`right` pointers (or a level-order array): tidy layout, glowing edges. */
export function TreeRenderer({ object }: RendererProps) {
  const { objects, diff } = useViz();
  const shape = useMemo(() => shapeOf(objects, object), [objects, object]);
  const layout = useMemo(() => layoutBinaryTree(shape.nodes.length, (index) => shape.children[index]), [shape]);

  if (shape.nodes.length === 0) {
    return (
      <div data-testid="renderer-tree">
        <EmptyChip label="empty tree" />
      </div>
    );
  }
  const nodes: CanvasNode[] = shape.nodes.map((node, index) => ({
    key: node.key,
    label: nodeLabel(objects, node.value),
    title: node.value ? summarizeValue(objects, node.value) : "node",
    x: layout.positions[index].x,
    depth: layout.positions[index].depth,
    status: node.objectId === null ? null : objectStatus(diff, node.objectId),
    relation: null,
    isEmphasized: index === 0,
  }));
  return (
    <div data-testid="renderer-tree" className="space-y-1.5">
      <TreeCanvas nodes={nodes} edges={shapeEdges(shape)} width={layout.width} levelCount={layout.levelCount} tone="violet" ariaLabel={`Binary tree of ${nodes.length} nodes`} />
      {shape.isTruncated ? <MoreChip count={1} className="w-fit" /> : null}
    </div>
  );
}
