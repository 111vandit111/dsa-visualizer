"use client";

import { AnimatePresence } from "framer-motion";
import { isBarsCompatible } from "@/lib/viz/bars";
import { cellStatus } from "@/lib/viz/diff";
import { objectHost, type Pointer, type PointerRange, type StepPointers } from "@/lib/viz/overlay-types";
import { itemKeys, itemsOf } from "@/lib/viz/structures";
import { gutterStyle } from "./pointer-gutter";
import { PointerTag } from "./pointer-marks";
import { pointerStyle } from "./pointer-styles";
import type { RendererProps } from "./renderer-types";
import { EmptyChip, MoreChip } from "./small-chips";
import { ValueCell } from "./value-cell";
import { ValueView } from "./value-view";
import { useViz } from "./viz-context";
import { ViewToggle } from "./view-toggle";

/** Shortest array that offers the cells/bars switch. */
const MIN_TOGGLE_LENGTH = 2;

/** The first range (paired window pointers such as left/right) that covers `index`. */
export function rangeCovering(ranges: readonly PointerRange[], index: number): PointerRange | null {
  return ranges.find((range) => index >= range.from && index <= range.to) ?? null;
}

/** In-range index pointers whose cell is not drawn (past the recorded/capped items): listed as chips after the last cell. */
export function pointersPastCells(pointers: StepPointers, host: string, shownCount: number): Pointer[] {
  return pointers.all.filter(
    (pointer) => pointer.target.host === host && !pointer.isOutOfRange && pointer.target.cellKey !== null && Number(pointer.target.cellKey) >= shownCount,
  );
}

/** Index pointers outside the array (`i=5 ›`): alive, but pointing past the end (or before the start). */
export function OutOfRangeChips({ pointers }: { pointers: readonly Pointer[] }) {
  return pointers.map((pointer) => {
    const isBefore = pointer.value.k === "number" && pointer.value.v < 0;
    return (
      <span key={`${pointer.frameId}:${pointer.name}`} className="inline-flex min-h-9 items-center gap-0.5 self-start" style={pointerStyle(pointer.slot)}>
        {isBefore ? <span aria-hidden="true" className="ptr-text text-xs">‹</span> : null}
        <PointerTag pointer={pointer} hasValue />
        {isBefore ? null : <span aria-hidden="true" className="ptr-text text-xs">›</span>}
      </span>
    );
  });
}

/** Soft tint behind a cell inside a pointer window; neighbouring cells' tints meet in the gap, forming one band. */
function RangeBand({ range }: { range: PointerRange }) {
  return (
    <span
      aria-hidden="true"
      data-testid="range-band"
      title={`${range.start.name}..${range.end.name}`}
      style={pointerStyle(range.start.slot)}
      className="ptr-tint pointer-events-none absolute -inset-x-[4px] -inset-y-[3px] -z-10 rounded-md"
    />
  );
}

/** Items in a row with their indices (arrays; also sets and heaps hinted as "array"). */
export function ArrayRenderer({ object, path, depth, ancestors }: RendererProps) {
  const { diff, pointers } = useViz();
  const { items, total } = itemsOf(object);
  const keys = itemKeys(items);
  const host = objectHost(object.id);
  const cellPointers = items.map((_, index) => pointers.at(host, String(index)));
  const outOfRange = pointers.outOfRange(host);
  const ranges = pointers.ranges(host);
  const maxPerCell = cellPointers.reduce((most, list) => Math.max(most, list.length), 0);
  const hasToggle = isBarsCompatible(object) && items.length >= MIN_TOGGLE_LENGTH;
  return (
    <div data-testid="renderer-array" role="group" aria-label={`Array of ${total} items`} className="flex flex-col gap-1.5">
      {hasToggle ? (
        <div className="flex justify-end">
          <ViewToggle path={path} mode="array" />
        </div>
      ) : null}
      <div style={gutterStyle(maxPerCell, "top")} className="isolate flex flex-wrap items-start gap-1.5">
        <AnimatePresence initial={false}>
          {items.map((item, index) => {
            const range = rangeCovering(ranges, index);
            return (
              <ValueCell
                key={keys[index]}
                tone="neutral"
                caption={String(index)}
                status={cellStatus(diff, object.id, String(index))}
                pointers={cellPointers[index]}
              >
                {range ? <RangeBand range={range} /> : null}
                <ValueView value={item} path={`${path}/${index}`} depth={depth + 1} ancestors={ancestors} />
              </ValueCell>
            );
          })}
        </AnimatePresence>
        <MoreChip count={total - items.length} />
        <OutOfRangeChips pointers={[...pointersPastCells(pointers, host, items.length), ...outOfRange]} />
        {total === 0 ? <EmptyChip label="empty" /> : null}
      </div>
    </div>
  );
}
