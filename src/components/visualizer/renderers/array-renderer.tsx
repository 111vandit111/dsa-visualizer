"use client";

import { AnimatePresence } from "framer-motion";
import { cellStatus } from "@/lib/viz/diff";
import { itemKeys, itemsOf } from "@/lib/viz/structures";
import type { RendererProps } from "./renderer-types";
import { EmptyChip, MoreChip } from "./small-chips";
import { ValueCell } from "./value-cell";
import { ValueView } from "./value-view";
import { useViz } from "./viz-context";

/** Items in a row with their indices (arrays; also sets and heaps hinted as "array"). */
export function ArrayRenderer({ object, path, depth, ancestors }: RendererProps) {
  const { diff } = useViz();
  const { items, total } = itemsOf(object);
  const keys = itemKeys(items);
  return (
    <div data-testid="renderer-array" role="group" aria-label={`Array of ${total} items`} className="flex flex-wrap items-start gap-1.5">
      <AnimatePresence initial={false}>
        {items.map((item, index) => (
          <ValueCell key={keys[index]} tone="neutral" caption={String(index)} status={cellStatus(diff, object.id, String(index))}>
            <ValueView value={item} path={`${path}/${index}`} depth={depth + 1} ancestors={ancestors} />
          </ValueCell>
        ))}
      </AnimatePresence>
      <MoreChip count={total - items.length} />
      {total === 0 ? <EmptyChip label="empty" /> : null}
    </div>
  );
}
