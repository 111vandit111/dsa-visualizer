"use client";

import { ArrowRightIcon } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import type { SObject, SValue } from "@/lib/tracer/types";
import { VIZ_LIMITS } from "@/lib/viz/constants";
import { objectStatus } from "@/lib/viz/diff";
import { collectListChain, itemKeys, itemsOf, type ChainEnd } from "@/lib/viz/structures";
import type { CellStatus, ObjectTable } from "@/lib/viz/types";
import type { RendererProps } from "./renderer-types";
import { EmptyChip } from "./small-chips";
import { ValueCell } from "./value-cell";
import { InlineValue } from "./value-view";
import { useViz } from "./viz-context";

interface ListNodeModel {
  key: string;
  value: SValue | null;
  status: CellStatus | null;
}

interface ListModel {
  nodes: ListNodeModel[];
  end: ChainEnd;
  cycleTo: number | null;
}

function modelOf(objects: ObjectTable, object: SObject, getStatus: (id: number) => CellStatus | null): ListModel {
  if (object.k === "object") {
    const chain = collectListChain(objects, object.id, VIZ_LIMITS.maxListNodes);
    const nodes = chain.nodes.map((node) => ({ key: `o${node.objectId}`, value: node.value, status: getStatus(node.objectId) }));
    return { nodes, end: chain.end, cycleTo: chain.cycleTo };
  }
  const { items, total } = itemsOf(object);
  const keys = itemKeys(items);
  const nodes = items.map((item, index) => ({ key: keys[index], value: item, status: null }));
  return { nodes, end: total > items.length ? "truncated" : "null", cycleTo: null };
}

function Arrow() {
  return <ArrowRightIcon className="mt-2.5 size-4 shrink-0 text-viz-cyan drop-shadow-[0_0_4px_var(--viz-cyan)]" aria-hidden="true" />;
}

function Terminator({ end, cycleTo }: { end: ChainEnd; cycleTo: number | null }) {
  if (end === "null") return <EmptyChip label="null" />;
  if (end === "cycle") return <EmptyChip label={`↻ back to #${cycleTo}`} className="border-viz-amber/50 text-viz-amber" />;
  if (end === "truncated") return <EmptyChip label="…" />;
  return null;
}

/** Nodes joined by arrows from the head until `null`, a cycle, or the cap. */
export function LinkedListRenderer({ object }: RendererProps) {
  const { objects, diff } = useViz();
  const model = modelOf(objects, object, (id) => objectStatus(diff, id));
  if (model.nodes.length === 0) {
    return (
      <div data-testid="renderer-linkedlist">
        <EmptyChip label="empty list" />
      </div>
    );
  }
  return (
    <div data-testid="renderer-linkedlist" role="group" aria-label={`Linked list of ${model.nodes.length} nodes`} className="flex flex-wrap items-start gap-y-2">
      <AnimatePresence initial={false}>
        {model.nodes.map((node, index) => (
          <ValueCell
            key={node.key}
            tone="cyan"
            status={node.status}
            caption={index === 0 ? "head" : undefined}
            trailing={index < model.nodes.length - 1 || model.end !== "unknown" ? <Arrow /> : undefined}
          >
            {node.value ? <InlineValue value={node.value} /> : <span className="font-mono text-xs text-muted-foreground">·</span>}
          </ValueCell>
        ))}
      </AnimatePresence>
      <Terminator end={model.end} cycleTo={model.cycleTo} />
    </div>
  );
}
