"use client";

import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { spring } from "@/lib/motion";
import type { SObject, SValue } from "@/lib/tracer/types";
import { cellStatus } from "@/lib/viz/diff";
import { objectHost, type Pointer, type StepPaths } from "@/lib/viz/overlay-types";
import type { ObjectTable } from "@/lib/viz/types";
import { cn } from "@/lib/utils";
import { ChangeHalo } from "./change-halo";
import { markStackPx } from "./pointer-gutter";
import { PointerMarks } from "./pointer-marks";
import { pointerColor, pointerRing, pointerStyle } from "./pointer-styles";
import type { RendererProps } from "./renderer-types";
import { EmptyChip, MoreChip } from "./small-chips";
import { pathRing } from "./tree-canvas";
import { InlineValue } from "./value-view";
import { useViz } from "./viz-context";

/** Largest visit number printed in a cell; later stops show no number. */
const MAX_ORDER_LABEL = 99;
const BAND_PERCENT = 20;
const REACHED_BACKGROUND = "color-mix(in oklch, var(--primary) 18%, transparent)";
/** Row gap when nothing points at the cells (px). */
const ROW_GAP_PX = 4;
const NO_SLOTS: readonly number[] = [];
const NO_POINTERS: readonly Pointer[] = [];

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

interface CellMark {
  /** Slots of the paths through this cell. */
  slots: number[];
  /** Visit number (1-based) in the first path that reaches it. */
  order: number | null;
  isReached: boolean;
}

/** `r,c` -> what paths and reach sets say about that cell. Points that are not a pair of integers are ignored. */
function cellMarksOf(paths: StepPaths): Map<string, CellMark> {
  const marks = new Map<string, CellMark>();
  const markOf = (point: readonly SValue[]): CellMark | null => {
    const [row, column] = point;
    if (row?.k !== "number" || column?.k !== "number" || !Number.isInteger(row.v) || !Number.isInteger(column.v)) return null;
    const key = `${row.v},${column.v}`;
    const mark = marks.get(key) ?? { slots: [], order: null, isReached: false };
    marks.set(key, mark);
    return mark;
  };
  for (const sequence of paths.sequences) {
    sequence.points.forEach((point, position) => {
      const mark = markOf(point);
      if (!mark) return;
      if (!mark.slots.includes(sequence.slot)) mark.slots.push(sequence.slot);
      if (mark.order === null) mark.order = position + 1;
    });
  }
  for (const set of paths.reached) {
    for (const point of set.points) {
      const mark = markOf(point);
      if (mark) mark.isReached = true;
    }
  }
  return marks;
}

/** Pointer names on cell (r, c): the column pointers, plus the row pointers when a column pointer makes it `grid[r][c]`. */
function cellPointersOf(rowPointers: readonly Pointer[], columnPointers: readonly Pointer[]): readonly Pointer[] {
  return columnPointers.length === 0 ? NO_POINTERS : [...rowPointers, ...columnPointers];
}

/** Inline style of a cell: pointer ring, else path rings, over a path/reach tint. Inline so it wins over the base classes. */
function cellStyle(pointers: readonly Pointer[], mark: CellMark | undefined): CSSProperties | undefined {
  const slots = mark?.slots ?? NO_SLOTS;
  const ring = pointers.length > 0 ? pointerRing(pointers) : pathRing(slots);
  const tint: CSSProperties =
    slots.length > 0
      ? { backgroundColor: `color-mix(in oklch, ${pointerColor(slots[0])} ${BAND_PERCENT}%, transparent)`, borderColor: pointerColor(slots[0]) }
      : mark?.isReached
        ? { backgroundColor: REACHED_BACKGROUND }
        : {};
  return { ...tint, ...ring };
}

interface GridCellProps {
  rowId: number;
  rowIndex: number;
  columnIndex: number;
  value: SValue;
  pointers: readonly Pointer[];
  mark: CellMark | undefined;
  /** Pointer that points at this cell's row: draws a faint band behind the cell. */
  band: Pointer | undefined;
}

function GridCell({ rowId, rowIndex, columnIndex, value, pointers, mark, band }: GridCellProps) {
  const { diff } = useViz();
  const status = cellStatus(diff, rowId, String(columnIndex));
  const slots = mark?.slots ?? NO_SLOTS;
  return (
    <motion.div
      role="gridcell"
      layout="position"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={spring.snappy}
      data-cell={`${rowIndex},${columnIndex}`}
      data-path-slots={slots.length > 0 ? slots.join(",") : undefined}
      data-reached={mark?.isReached ? "true" : undefined}
      style={cellStyle(pointers, mark)}
      className="relative flex min-h-9 min-w-9 items-center justify-center rounded-md border border-border bg-muted/60 px-2 py-1"
    >
      {band ? (
        <span
          aria-hidden="true"
          data-testid="row-band"
          style={pointerStyle(band.slot)}
          className="ptr-tint pointer-events-none absolute -inset-0.5 -z-10 rounded-md"
        />
      ) : null}
      <ChangeHalo status={status} />
      <InlineValue value={value} />
      {mark?.order != null && mark.order <= MAX_ORDER_LABEL ? (
        <span data-testid="path-order" className="pointer-events-none absolute right-0.5 bottom-0 font-mono text-[8px] leading-none text-muted-foreground">
          {mark.order}
        </span>
      ) : null}
      {pointers.length > 0 ? <PointerMarks pointers={pointers} /> : null}
    </motion.div>
  );
}

/** A row/column index label, tinted in the colour of the pointer(s) that sit on it. */
function IndexHeader({ index, pointers }: { index: number; pointers: readonly Pointer[] }) {
  const first = pointers[0];
  return (
    <span
      data-pointer-header={first ? pointers.map((pointer) => pointer.name).join(",") : undefined}
      style={first ? { ...pointerStyle(first.slot), color: "var(--ptr)" } : undefined}
      className={cn("micro-label rounded text-center text-[10px]", first && "ptr-tint")}
    >
      {index}
    </span>
  );
}

/** Pointers (by name) of a list, once each. */
function uniquePointers(lists: readonly (readonly Pointer[])[]): Pointer[] {
  const seen = new Set<string>();
  return lists.flat().filter((pointer) => {
    const key = `${pointer.frameId}:${pointer.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Array of equal-length arrays as a matrix with row/column indices; row/column pointers and DFS paths light up cells. */
export function GridRenderer({ object }: RendererProps) {
  const { objects, pointers, paths } = useViz();
  const { rows, rowTotal } = gridRows(objects, object);
  const columnCount = Math.max(0, ...rows.map((row) => row.cells.length));
  if (rows.length === 0 || columnCount === 0) {
    return (
      <div data-testid="renderer-grid">
        <EmptyChip label="empty grid" />
      </div>
    );
  }
  const marks = cellMarksOf(paths);
  const rowPointers = rows.map((row, rowIndex) => [...pointers.at(objectHost(object.id), String(rowIndex)), ...pointers.at(objectHost(row.id), null)]);
  const columnPointers = rows.map((row) => row.cells.map((_, column) => pointers.at(objectHost(row.id), String(column))));
  const headerPointers = Array.from({ length: columnCount }, (_, column) => uniquePointers(columnPointers.map((perColumn) => perColumn[column] ?? NO_POINTERS)));
  const cellPointers = rows.map((_, rowIndex) => columnPointers[rowIndex].map((list) => cellPointersOf(rowPointers[rowIndex], list)));
  const maxPerCell = cellPointers.reduce((most, perColumn) => Math.max(most, ...perColumn.map((list) => list.length)), 0);
  return (
    <div data-testid="renderer-grid" className="max-w-full overflow-x-auto pb-1">
      <div
        role="grid"
        aria-label={`Grid ${rows.length} by ${columnCount}`}
        className="isolate inline-grid items-center gap-x-1"
        style={{ gridTemplateColumns: `1.5rem repeat(${columnCount}, minmax(2.25rem, auto))`, rowGap: Math.max(ROW_GAP_PX, markStackPx(maxPerCell)) }}
      >
        <span aria-hidden="true" />
        {headerPointers.map((list, column) => (
          <IndexHeader key={column} index={column} pointers={list} />
        ))}
        <AnimatePresence initial={false}>
          {rows.flatMap((row, rowIndex) => [
            <IndexHeader key={`h${rowIndex}`} index={rowIndex} pointers={rowPointers[rowIndex]} />,
            ...row.cells.map((value, columnIndex) => (
              <GridCell
                key={`${rowIndex}:${columnIndex}`}
                rowId={row.id}
                rowIndex={rowIndex}
                columnIndex={columnIndex}
                value={value}
                pointers={cellPointers[rowIndex][columnIndex]}
                mark={marks.get(`${rowIndex},${columnIndex}`)}
                band={rowPointers[rowIndex][0]}
              />
            )),
            ...Array.from({ length: columnCount - row.cells.length }, (_, pad) => <span key={`p${rowIndex}:${pad}`} />),
          ])}
        </AnimatePresence>
      </div>
      <MoreChip count={rowTotal - rows.length} className="mt-1.5" />
    </div>
  );
}
