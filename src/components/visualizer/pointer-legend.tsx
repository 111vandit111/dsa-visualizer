import { summarizeValue } from "@/lib/viz/format";
import type { Pointer, StepPointers } from "@/lib/viz/overlay-types";
import type { ObjectTable } from "@/lib/viz/types";
import { cn } from "@/lib/utils";
import { pointerStyle } from "./renderers/pointer-styles";

/** Identity of a pointer variable: the same name in two frames is two variables. */
export function pointerKey(pointer: Pick<Pointer, "frameId" | "name">): string {
  return `${pointer.frameId}:${pointer.name}`;
}

/** One entry per pointer variable (a name indexing two arrays is listed once), null ref names included; colour slot order. */
export function legendPointers(pointers: StepPointers): Pointer[] {
  const byKey = new Map<string, Pointer>();
  for (const pointer of [...pointers.all, ...pointers.nulls]) {
    if (!byKey.has(pointerKey(pointer))) byKey.set(pointerKey(pointer), pointer);
  }
  return [...byKey.values()].sort((a, b) => a.slot - b.slot || Number(b.isActive) - Number(a.isActive));
}

/** A legend row: a pointer name, the innermost frame's pointer, and how many frames hold a variable of that name. */
export interface LegendRow {
  pointer: Pointer;
  depth: number;
}

/** `legendPointers` grouped by name: a recursive `node` is one row (innermost value, ×depth), not one per frame. */
export function legendRows(pointers: StepPointers): LegendRow[] {
  const byName = new Map<string, LegendRow>();
  for (const pointer of legendPointers(pointers)) {
    const row = byName.get(pointer.name);
    if (!row) byName.set(pointer.name, { pointer, depth: 1 });
    else {
      row.depth += 1;
      // Frame ids grow with every call, so the highest one is the innermost.
      if (pointer.frameId > row.pointer.frameId) row.pointer = pointer;
    }
  }
  return [...byName.values()];
}

function LegendItem({ row, objects }: { row: LegendRow; objects: ObjectTable }) {
  const { pointer, depth } = row;
  const summary = summarizeValue(objects, pointer.value);
  return (
    <li
      data-testid="pointer-legend-item"
      data-pointer={pointer.name}
      data-slot={pointer.slot}
      data-active={pointer.isActive}
      data-depth={depth}
      style={pointerStyle(pointer.slot)}
      className={cn(
        "flex max-w-full min-w-0 items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[11px]",
        pointer.isActive ? "ptr-chip" : "ptr-chip-dim",
      )}
    >
      <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full bg-(--ptr)", !pointer.isActive && "ptr-dim")} />
      <span className="shrink-0">{pointer.name}</span>
      <span className="shrink-0 text-muted-foreground">=</span>
      <span className="min-w-0 truncate text-foreground" title={summary}>
        {summary}
      </span>
      {depth > 1 ? (
        <span className="shrink-0 text-muted-foreground" title={`${depth} frames have a variable named ${pointer.name}; the innermost is shown`}>
          ×{depth}
        </span>
      ) : null}
    </li>
  );
}

interface PointerLegendProps {
  pointers: StepPointers;
  objects: ObjectTable;
}

/** Key to the pointer colours: one chip per pointer name (dot, name, innermost value). Hidden when there are none. */
export function PointerLegend({ pointers, objects }: PointerLegendProps) {
  const rows = legendRows(pointers);
  if (rows.length === 0) return null;
  return (
    <section data-testid="pointer-legend" aria-label="Pointers" className="space-y-2">
      <p className="micro-label">Pointers · {rows.length}</p>
      <ul className="flex flex-wrap gap-1.5">
        {rows.map((row) => (
          <LegendItem key={row.pointer.name} row={row} objects={objects} />
        ))}
      </ul>
    </section>
  );
}
