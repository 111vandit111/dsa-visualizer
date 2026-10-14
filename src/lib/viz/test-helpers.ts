import type { SObject, SPrimitive, SRef, SValue, TraceFrame, TraceStep } from "@/lib/tracer/types";
import type { ObjectTable } from "./types";

export const num = (v: number): SPrimitive => ({ k: "number", v });
export const str = (v: string): SPrimitive => ({ k: "string", v });
export const nul: SPrimitive = { k: "null" };
export const ref = (id: number): SRef => ({ k: "ref", id });

export const arr = (id: number, items: SValue[], length = items.length): SObject => ({ k: "array", id, items, length });
export const obj = (id: number, entries: [string, SValue][], className = "Object"): SObject => ({
  k: "object",
  id,
  className,
  entries,
  size: entries.length,
});
export const set = (id: number, items: SValue[]): SObject => ({ k: "set", id, items, size: items.length });
export const map = (id: number, entries: [SValue, SValue][]): SObject => ({ k: "map", id, entries, size: entries.length });
export const heap = (id: number, items: SValue[]): SObject => ({ k: "heap", id, items, size: items.length });

export function table(...objects: SObject[]): ObjectTable {
  return Object.fromEntries(objects.map((object) => [object.id, object]));
}

export function frame(id: number, locals: [string, SValue][], self: SValue = { k: "undefined" }, name = "fn"): TraceFrame {
  return { id, name, line: 1, locals: locals.map(([localName, value]) => ({ name: localName, value })), self };
}

export function step(index: number, frames: TraceFrame[], objects: ObjectTable): TraceStep {
  return { index, kind: "step", line: 1, opIndex: 0, frames, objects };
}
