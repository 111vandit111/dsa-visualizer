"use client";

import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { VIZ_LIMITS } from "@/lib/viz/constants";
import { cellStatus } from "@/lib/viz/diff";
import { nodeLabel, summarizeValue } from "@/lib/viz/format";
import { objectHost } from "@/lib/viz/overlay-types";
import { itemKeys, itemsOf } from "@/lib/viz/structures";
import { heapChildren, heapParent, layoutBinaryTree } from "@/lib/viz/tree-layout";
import { cn } from "@/lib/utils";
import { OutOfRangeChips, pointersPastCells } from "./array-renderer";
import { gutterStyle } from "./pointer-gutter";
import type { RendererProps } from "./renderer-types";
import { EmptyChip, MoreChip } from "./small-chips";
import { TreeCanvas, type CanvasEdge, type CanvasNode, type Relation } from "./tree-canvas";
import { ValueCell } from "./value-cell";
import { InlineValue } from "./value-view";
import { useViz } from "./viz-context";

const RELATION_RING: Record<Relation, string> = {
  self: "border-foreground/80",
  parent: "border-viz-cyan",
  child: "border-primary/80",
};

/** How a heap slot relates to the hovered one: the slot itself, its parent, or one of its children. */
function relationOf(index: number, focus: number | null): Relation | null {
  if (focus === null) return null;
  if (index === focus) return "self";
  if (index === heapParent(focus)) return "parent";
  return heapParent(index) === focus ? "child" : null;
}

function heapEdges(count: number, keys: readonly string[]): CanvasEdge[] {
  const edges: CanvasEdge[] = [];
  for (let index = 1; index < count; index++) {
    const parent = heapParent(index) as number;
    edges.push({ key: `${keys[parent]}>${keys[index]}`, fromKey: keys[parent], toKey: keys[index] });
  }
  return edges;
}

/** Priority queue as a binary tree plus the backing array it is stored in (hover a slot to see parent/children). */
export function HeapRenderer({ object }: RendererProps) {
  const { objects, diff, pointers } = useViz();
  const { items, total } = itemsOf(object);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const treeCount = Math.min(items.length, VIZ_LIMITS.maxHeapTreeNodes);
  const keys = itemKeys(items);
  const layout = useMemo(() => layoutBinaryTree(treeCount, heapChildren(treeCount)), [treeCount]);
  const host = objectHost(object.id);
  const slotPointers = items.map((_, index) => pointers.at(host, String(index)));
  const maxPerSlot = slotPointers.reduce((most, list) => Math.max(most, list.length), 0);

  const nodes: CanvasNode[] = items.slice(0, treeCount).map((item, index) => ({
    key: keys[index],
    label: nodeLabel(objects, item),
    title: `[${index}] ${summarizeValue(objects, item)}`,
    x: layout.positions[index].x,
    depth: layout.positions[index].depth,
    status: cellStatus(diff, object.id, String(index)),
    relation: relationOf(index, focusIndex),
    isEmphasized: index === 0,
    caption: String(index),
    pointers: slotPointers[index],
  }));

  if (items.length === 0) {
    return (
      <div data-testid="renderer-heap">
        <EmptyChip label="empty heap" />
      </div>
    );
  }
  return (
    <div data-testid="renderer-heap" className="space-y-2">
      <TreeCanvas
        nodes={nodes}
        edges={heapEdges(treeCount, keys)}
        width={layout.width}
        levelCount={layout.levelCount}
        tone="violet"
        ariaLabel={`Heap tree of ${total} items`}
        onHoverChange={(key) => setFocusIndex(key === null ? null : keys.indexOf(key))}
      />
      <div role="group" aria-label="Heap backing array" style={gutterStyle(maxPerSlot, "top")} className={cn("flex flex-wrap items-start gap-1.5 border-t border-border", maxPerSlot === 0 && "pt-2")}>
        <AnimatePresence initial={false}>
          {items.map((item, index) => {
            const relation = relationOf(index, focusIndex);
            return (
              <ValueCell
                key={keys[index]}
                tone="violet"
                caption={String(index)}
                status={cellStatus(diff, object.id, String(index))}
                isEmphasized={index === 0}
                pointers={slotPointers[index]}
                className={cn("min-h-8", relation && RELATION_RING[relation])}
                onHoverChange={(isActive) => setFocusIndex(isActive ? index : null)}
              >
                <InlineValue value={item} />
              </ValueCell>
            );
          })}
        </AnimatePresence>
        <MoreChip count={total - items.length} />
        <OutOfRangeChips pointers={[...pointersPastCells(pointers, host, items.length), ...pointers.outOfRange(host)]} />
      </div>
    </div>
  );
}
