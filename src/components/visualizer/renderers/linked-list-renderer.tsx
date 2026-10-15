"use client";

import { ArrowLeftRightIcon, ArrowRightIcon } from "lucide-react";
import { AnimatePresence, MotionConfig } from "framer-motion";
import type { SObject, SValue } from "@/lib/tracer/types";
import { VIZ_LIMITS } from "@/lib/viz/constants";
import { objectStatus } from "@/lib/viz/diff";
import { objectHost, type Pointer } from "@/lib/viz/overlay-types";
import { collectListChain, itemKeys, itemsOf, type ChainEnd } from "@/lib/viz/structures";
import type { CellStatus, ObjectTable } from "@/lib/viz/types";
import { OutOfRangeChips } from "./array-renderer";
import { gutterStyle, markStackPx } from "./pointer-gutter";
import { PointerMarks } from "./pointer-marks";
import type { RendererProps } from "./renderer-types";
import { EmptyChip } from "./small-chips";
import { ValueCell } from "./value-cell";
import { InlineValue } from "./value-view";
import { useViz } from "./viz-context";

/** Space between wrapped rows when nothing points at the nodes (px). */
const ROW_GAP_PX = 8;

interface ListNodeModel {
  key: string;
  /** Where pointers to this node are looked up: its object (null cell), or its slot in a backing array. */
  objectId: number | null;
  value: SValue | null;
  status: CellStatus | null;
  /** The next node's `prev` points back here: draw a two-way link. */
  isLinkedToNext: boolean;
}

interface ListModel {
  nodes: ListNodeModel[];
  end: ChainEnd;
  cycleTo: number | null;
}

function modelOf(objects: ObjectTable, object: SObject, getStatus: (id: number) => CellStatus | null): ListModel {
  if (object.k === "object") {
    const chain = collectListChain(objects, object.id, VIZ_LIMITS.maxListNodes);
    const nodes = chain.nodes.map((node, index) => ({
      key: `o${node.objectId}`,
      objectId: node.objectId,
      value: node.value,
      status: getStatus(node.objectId),
      isLinkedToNext: chain.nodes[index + 1]?.isLinkedBack === true,
    }));
    return { nodes, end: chain.end, cycleTo: chain.cycleTo };
  }
  const { items, total } = itemsOf(object);
  const keys = itemKeys(items);
  const nodes = items.map((item, index) => ({ key: keys[index], objectId: null, value: item, status: null, isLinkedToNext: false }));
  return { nodes, end: total > items.length ? "truncated" : "null", cycleTo: null };
}

function Arrow({ isTwoWay }: { isTwoWay: boolean }) {
  const Icon = isTwoWay ? ArrowLeftRightIcon : ArrowRightIcon;
  return <Icon className="mt-2.5 size-4 shrink-0 text-viz-cyan drop-shadow-[0_0_4px_var(--viz-cyan)]" aria-hidden="true" />;
}

/** The `null` end of the list, with the names of the pointers that are null now (`curr`, `prev`...) above it. */
function Terminator({ end, cycleTo, nulls }: { end: ChainEnd; cycleTo: number | null; nulls: readonly Pointer[] }) {
  if (end === "null") {
    return (
      <span className="relative inline-flex">
        <EmptyChip label="null" />
        <PointerMarks pointers={nulls} />
      </span>
    );
  }
  if (end === "cycle") return <EmptyChip label={`↻ back to #${cycleTo}`} className="border-viz-amber/50 text-viz-amber" />;
  if (end === "truncated") return <EmptyChip label="…" />;
  return null;
}

/** Caption of the first node: the variable the list hangs from (`tail`, `head`...), `head` when it is an element or return value. */
export function listCaption(path: string): string {
  const name = path.slice(path.lastIndexOf("/") + 1);
  return name === "" || /^\d+$/.test(name) ? "head" : name;
}

/** Nodes joined by arrows from the head until `null`, a cycle, or the cap. */
export function LinkedListRenderer({ object, path }: RendererProps) {
  const { objects, diff, pointers } = useViz();
  const model = modelOf(objects, object, (id) => objectStatus(diff, id));
  const nodePointers = model.nodes.map((node, index) =>
    node.objectId === null ? pointers.at(objectHost(object.id), String(index)) : pointers.at(objectHost(node.objectId), null),
  );
  const nulls = model.end === "null" ? pointers.nulls : [];
  const maxPerNode = Math.max(nulls.length, ...nodePointers.map((list) => list.length));
  const rowGap = Math.max(ROW_GAP_PX, markStackPx(maxPerNode));
  if (model.nodes.length === 0) {
    return (
      <div data-testid="renderer-linkedlist">
        <EmptyChip label="empty list" />
      </div>
    );
  }
  return (
    <MotionConfig reducedMotion="user">
    <div data-testid="renderer-linkedlist" role="group" aria-label={`Linked list of ${model.nodes.length} nodes`} style={{ ...gutterStyle(maxPerNode, "top"), rowGap }} className="flex flex-wrap items-start">
      <AnimatePresence initial={false}>
        {model.nodes.map((node, index) => (
          <ValueCell
            key={node.key}
            tone="cyan"
            status={node.status}
            caption={index === 0 ? listCaption(path) : undefined}
            pointers={nodePointers[index]}
            trailing={index < model.nodes.length - 1 || model.end !== "unknown" ? <Arrow isTwoWay={node.isLinkedToNext} /> : undefined}
          >
            {node.value ? <InlineValue value={node.value} /> : <span className="font-mono text-xs text-muted-foreground">·</span>}
          </ValueCell>
        ))}
      </AnimatePresence>
      <Terminator end={model.end} cycleTo={model.cycleTo} nulls={nulls} />
      <OutOfRangeChips pointers={object.k === "object" ? [] : pointers.outOfRange(objectHost(object.id))} />
    </div>
    </MotionConfig>
  );
}
