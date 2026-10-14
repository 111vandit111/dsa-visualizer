"use client";

import { ArrowRightIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { spring } from "@/lib/motion";
import type { SObject, SValue } from "@/lib/tracer/types";
import { cellStatus, valueKey } from "@/lib/viz/diff";
import { containerLabel } from "@/lib/viz/format";
import type { RendererProps } from "./renderer-types";
import { ChangeHalo } from "./change-halo";
import { EmptyChip, MoreChip } from "./small-chips";
import { InlineValue, ValueView } from "./value-view";
import { useViz } from "./viz-context";

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

function MapRowView({ row, objectId, path, depth, ancestors }: { row: MapRow; objectId: number; path: string; depth: number; ancestors: readonly number[] }) {
  const { diff } = useViz();
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={spring.snappy}
      className="relative flex flex-wrap items-start gap-x-2 gap-y-1 rounded-lg border border-border bg-muted/40 px-2 py-1.5"
    >
      <ChangeHalo status={cellStatus(diff, objectId, row.cellKey)} />
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
  const { rows, total } = rowsOf(object);
  return (
    <div data-testid="renderer-map" className="space-y-1.5">
      {depth === 0 ? <p className="micro-label text-primary/80">{containerLabel(object)}</p> : null}
      <div role="group" aria-label={containerLabel(object)} className="space-y-1.5">
        <AnimatePresence initial={false}>
          {rows.map((row) => (
            <MapRowView key={row.cellKey} row={row} objectId={object.id} path={path} depth={depth} ancestors={ancestors} />
          ))}
        </AnimatePresence>
      </div>
      <MoreChip count={total - rows.length} />
      {total === 0 ? <EmptyChip label="empty" /> : null}
    </div>
  );
}
