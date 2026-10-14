"use client";

import { AnimatePresence } from "framer-motion";
import { cellStatus, valueKey } from "@/lib/viz/diff";
import { itemKeys, itemsOf } from "@/lib/viz/structures";
import type { RendererProps } from "./renderer-types";
import { EmptyChip, MoreChip } from "./small-chips";
import { ValueCell } from "./value-cell";
import { ValueView } from "./value-view";
import { useViz } from "./viz-context";

/** Unordered members as cyan chips inside braces. */
export function SetRenderer({ object, path, depth, ancestors }: RendererProps) {
  const { diff } = useViz();
  const { items, total } = itemsOf(object);
  const keys = itemKeys(items);
  return (
    <div
      data-testid="renderer-set"
      role="group"
      aria-label={`Set of ${total} items`}
      className="flex flex-wrap items-center gap-1.5 rounded-lg border border-viz-cyan/25 bg-viz-cyan/5 px-2 py-1.5"
    >
      <span className="font-mono text-sm text-viz-cyan" aria-hidden="true">
        {"{"}
      </span>
      <AnimatePresence initial={false}>
        {items.map((item, index) => (
          <ValueCell key={keys[index]} tone="cyan" status={cellStatus(diff, object.id, valueKey(item))}>
            <ValueView value={item} path={`${path}/${valueKey(item)}`} depth={depth + 1} ancestors={ancestors} />
          </ValueCell>
        ))}
      </AnimatePresence>
      <MoreChip count={total - items.length} />
      {total === 0 ? <EmptyChip label="empty" className="border-transparent" /> : null}
      <span className="font-mono text-sm text-viz-cyan" aria-hidden="true">
        {"}"}
      </span>
    </div>
  );
}
