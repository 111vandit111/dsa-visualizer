"use client";

import { AnimatePresence, motion } from "framer-motion";
import { spring } from "@/lib/motion";
import type { SObject, SValue } from "@/lib/tracer/types";
import { cellStatus } from "@/lib/viz/diff";
import type { ObjectTable } from "@/lib/viz/types";
import { ChangeHalo } from "./change-halo";
import type { RendererProps } from "./renderer-types";
import { EmptyChip, MoreChip } from "./small-chips";
import { InlineValue } from "./value-view";
import { useViz } from "./viz-context";

interface GridRow {
  id: number;
  cells: readonly SValue[];
}

function gridRows(objects: ObjectTable, object: SObject): { rows: GridRow[]; rowTotal: number } {
  if (object.k !== "array") return { rows: [], rowTotal: 0 };
  const rows: GridRow[] = [];
  for (const item of object.items) {
    const row = item.k === "ref" ? objects[item.id] : undefined;
    if (row?.k === "array") rows.push({ id: row.id, cells: row.items });
  }
  return { rows, rowTotal: object.length };
}

function GridCell({ rowId, rowIndex, columnIndex, value }: { rowId: number; rowIndex: number; columnIndex: number; value: SValue }) {
  const { diff } = useViz();
  const status = cellStatus(diff, rowId, String(columnIndex));
  return (
    <motion.div
      role="gridcell"
      layout="position"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={spring.snappy}
      data-cell={`${rowIndex},${columnIndex}`}
      className="relative flex min-h-9 min-w-9 items-center justify-center rounded-md border border-border bg-muted/60 px-2 py-1"
    >
      <ChangeHalo status={status} />
      <InlineValue value={value} />
    </motion.div>
  );
}

/** Array of equal-length arrays as a matrix with row/column indices. */
export function GridRenderer({ object }: RendererProps) {
  const { objects } = useViz();
  const { rows, rowTotal } = gridRows(objects, object);
  const columnCount = Math.max(0, ...rows.map((row) => row.cells.length));
  if (rows.length === 0 || columnCount === 0) {
    return (
      <div data-testid="renderer-grid">
        <EmptyChip label="empty grid" />
      </div>
    );
  }
  return (
    <div data-testid="renderer-grid" className="max-w-full overflow-x-auto pb-1">
      <div
        role="grid"
        aria-label={`Grid ${rows.length} by ${columnCount}`}
        className="inline-grid items-center gap-1"
        style={{ gridTemplateColumns: `1.5rem repeat(${columnCount}, minmax(2.25rem, auto))` }}
      >
        <span aria-hidden="true" />
        {Array.from({ length: columnCount }, (_, column) => (
          <span key={column} className="micro-label text-center text-[10px]">
            {column}
          </span>
        ))}
        <AnimatePresence initial={false}>
          {rows.flatMap((row, rowIndex) => [
            <span key={`h${rowIndex}`} className="micro-label text-[10px]">
              {rowIndex}
            </span>,
            ...row.cells.map((value, columnIndex) => (
              <GridCell key={`${rowIndex}:${columnIndex}`} rowId={row.id} rowIndex={rowIndex} columnIndex={columnIndex} value={value} />
            )),
            ...Array.from({ length: columnCount - row.cells.length }, (_, pad) => <span key={`p${rowIndex}:${pad}`} />),
          ])}
        </AnimatePresence>
      </div>
      <MoreChip count={rowTotal - rows.length} className="mt-1.5" />
    </div>
  );
}
