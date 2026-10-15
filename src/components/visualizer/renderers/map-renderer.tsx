"use client";

import { ArrowRightIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { spring } from "@/lib/motion";
import type { SObject, SValue } from "@/lib/tracer/types";
import { cellStatus, valueKey } from "@/lib/viz/diff";
import { containerLabel } from "@/lib/viz/format";
import { objectHost, type Pointer } from "@/lib/viz/overlay-types";
import type { RendererProps } from "./renderer-types";
import { ChangeHalo } from "./change-halo";
import { gutterStyle, markStackPx } from "./pointer-gutter";
import { PointerMarks } from "./pointer-marks";
import { pointerRing } from "./pointer-styles";
import { EmptyChip, MoreChip } from "./small-chips";
import { InlineValue, ValueView } from "./value-view";
import { useViz } from "./viz-context";

/** Space between rows when nothing points at them (px). */
const ROW_GAP_PX = 6;

interface MapRow {
  cellKey: string;
  key: SValue | string;
  value: SValue;
}

function rowsOf(object: SObject): { rows: MapRow[]; total: number } {
  if (object.k === "object") {
    return { rows: object.entries.map(([name, value]) => ({ cellKey: name, key: name, value })), total: object.size };
  }
  if (object.k === "map") {
    return { rows: object.entries.map(([key, value]) => ({ cellKey: valueKey(key), key, value })), total: object.size };
  }
  return { rows: [], total: 0 };
}

function KeyChip({ rowKey }: { rowKey: SValue | string }) {
  return (
    <span className="inline-flex min-h-7 shrink-0 items-center rounded-md border border-primary/30 bg-primary/10 px-2 font-mono text-[13px] text-primary">
      {typeof rowKey === "string" ? rowKey : <InlineValue value={rowKey} />}
    </span>
  );
}

interface MapRowViewProps {
  row: MapRow;
  objectId: number;
  path: string;
  depth: number;
  ancestors: readonly number[];
  pointers: readonly Pointer[];
}

function MapRowView({ row, objectId, path, depth, ancestors, pointers }: MapRowViewProps) {
  const { diff } = useViz();
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={spring.snappy}
      style={pointers.length > 0 ? pointerRing(pointers) : undefined}
      className="relative flex flex-wrap items-start gap-x-2 gap-y-1 rounded-lg border border-border bg-muted/40 px-2 py-1.5"
    >
      <ChangeHalo status={cellStatus(diff, objectId, row.cellKey)} />
      {pointers.length > 0 ? (
        <span className="absolute top-0 right-4 size-0">
          <PointerMarks pointers={pointers} />
        </span>
      ) : null}
      <KeyChip rowKey={row.key} />
      <ArrowRightIcon className="mt-1.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1 basis-24 pt-0.5">
        <ValueView value={row.value} path={`${path}/${row.cellKey}`} depth={depth + 1} ancestors={ancestors} />
      </div>
    </motion.div>
  );
}

/** Key to value rows for maps, plain objects and class instances (`this`). */
export function MapRenderer({ object, path, depth, ancestors }: RendererProps) {
  const { pointers } = useViz();
  const { rows, total } = rowsOf(object);
  const rowPointers = rows.map((row) => pointers.at(objectHost(object.id), row.cellKey));
  const maxPerRow = rowPointers.reduce((most, list) => Math.max(most, list.length), 0);
  return (
    <div data-testid="renderer-map" className="space-y-1.5">
      {depth === 0 ? <p className="micro-label text-primary/80">{containerLabel(object)}</p> : null}
      <div role="group" aria-label={containerLabel(object)} style={{ ...gutterStyle(maxPerRow, "top"), rowGap: Math.max(ROW_GAP_PX, markStackPx(maxPerRow)) }} className="flex flex-col">
        <AnimatePresence initial={false}>
          {rows.map((row, index) => (
            <MapRowView key={row.cellKey} row={row} objectId={object.id} path={path} depth={depth} ancestors={ancestors} pointers={rowPointers[index]} />
          ))}
        </AnimatePresence>
      </div>
      <MoreChip count={total - rows.length} />
      {total === 0 ? <EmptyChip label="empty" /> : null}
    </div>
  );
}
