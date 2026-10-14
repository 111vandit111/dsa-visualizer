import type { ObjectTable } from "./types";
import type { JsonValue, SObject, SPrimitive, SValue } from "@/lib/tracer/types";
import { VIZ_LIMITS } from "./constants";

export type PrimitiveTone = "number" | "string" | "boolean" | "muted" | "function";

export interface FormattedPrimitive {
  text: string;
  tone: PrimitiveTone;
}

const ELLIPSIS = "…";

export function truncateText(text: string, maxChars: number): string {
  return text.length > maxChars ? `${text.slice(0, maxChars)}${ELLIPSIS}` : text;
}

function formatNumber(value: number): string {
  return Object.is(value, -0) ? "-0" : String(value);
}

export function formatPrimitive(value: SPrimitive, maxStringChars: number = VIZ_LIMITS.maxStringChars): FormattedPrimitive {
  switch (value.k) {
    case "undefined":
      return { text: "undefined", tone: "muted" };
    case "null":
      return { text: "null", tone: "muted" };
    case "boolean":
      return { text: String(value.v), tone: "boolean" };
    case "number":
      return { text: formatNumber(value.v), tone: "number" };
    case "bigint":
      return { text: `${value.v}n`, tone: "number" };
    case "string":
      return { text: `"${truncateText(value.v, maxStringChars)}"`, tone: "string" };
    case "symbol":
      return { text: value.v, tone: "string" };
    case "function":
      return { text: value.name ? `ƒ ${value.name}` : "ƒ", tone: "function" };
    case "opaque":
      return { text: value.label, tone: "muted" };
  }
}

/** Placeholder for a container that is not expanded: `[…3]`, `{…}`. */
function containerStub(object: SObject): string {
  switch (object.k) {
    case "array":
      return `[${ELLIPSIS}${object.length}]`;
    case "heap":
      return `Heap(${object.size})`;
    case "set":
      return `Set(${object.size})`;
    case "map":
      return `Map(${object.size})`;
    case "object":
      return object.className === "Object" ? `{${ELLIPSIS}}` : `${object.className} {${ELLIPSIS}}`;
  }
}

function shallowText(objects: ObjectTable, value: SValue): string {
  if (value.k !== "ref") return formatPrimitive(value).text;
  const target = objects[value.id];
  return target ? containerStub(target) : `#${value.id}`;
}

function joinWithMore(parts: string[], total: number): string {
  return total > parts.length ? `${parts.join(", ")}, ${ELLIPSIS}` : parts.join(", ");
}

function summarizeItems(objects: ObjectTable, items: readonly SValue[], total: number): string {
  const shown = items.slice(0, VIZ_LIMITS.maxSummaryItems).map((item) => shallowText(objects, item));
  return joinWithMore(shown, total);
}

function summarizeObject(objects: ObjectTable, object: SObject): string {
  switch (object.k) {
    case "array":
      return `[${summarizeItems(objects, object.items, object.length)}]`;
    case "heap":
      return `Heap(${object.size}) [${summarizeItems(objects, object.items, object.size)}]`;
    case "set":
      return `Set(${object.size}) {${summarizeItems(objects, object.items, object.size)}}`;
    case "map":
      return `Map(${object.size})`;
    case "object": {
      const keys = object.entries.slice(0, VIZ_LIMITS.maxSummaryItems).map(([name]) => name);
      const body = joinWithMore(keys, object.size);
      return object.className === "Object" ? `{${body}}` : `${object.className} {${body}}`;
    }
  }
}

/** One-line description of any value, e.g. `[1, 5, 1, -1]` or `Set(2) {1, 2}`. Bounded: no deep recursion. */
export function summarizeValue(objects: ObjectTable, value: SValue): string {
  if (value.k !== "ref") return formatPrimitive(value).text;
  const target = objects[value.id];
  return target ? summarizeObject(objects, target) : `ref #${value.id}`;
}

/** Short label for a node in a tree/list: primitives as-is, arrays as `1,5,1,-1`, other containers as a stub. */
export function nodeLabel(objects: ObjectTable, value: SValue | null): string {
  if (value === null) return ELLIPSIS;
  if (value.k !== "ref") return truncateText(formatPrimitive(value).text.replace(/^"|"$/g, ""), VIZ_LIMITS.maxLabelChars);
  const target = objects[value.id];
  if (!target) return ELLIPSIS;
  if (target.k === "array" || target.k === "heap") {
    const parts = target.items.map((item) => (item.k === "ref" ? ELLIPSIS : formatPrimitive(item).text.replace(/^"|"$/g, "")));
    return truncateText(parts.join(","), VIZ_LIMITS.maxLabelChars);
  }
  return truncateText(containerStub(target), VIZ_LIMITS.maxLabelChars);
}

/** `Set · 2`, `Array · 7`: the kind and size shown on an expanded container header. */
export function containerLabel(object: SObject): string {
  switch (object.k) {
    case "array":
      return `Array · ${object.length}`;
    case "heap":
      return `Heap · ${object.size}`;
    case "set":
      return `Set · ${object.size}`;
    case "map":
      return `Map · ${object.size}`;
    case "object":
      return object.className === "Object" ? `Object · ${object.size}` : object.className;
  }
}

const MAX_JSON_CHARS = 48;

/** Compact JSON for an op's args/expected/actual value, cut to fit a card. */
export function formatJsonValue(value: JsonValue, maxChars: number = MAX_JSON_CHARS): string {
  return truncateText(JSON.stringify(value) ?? "undefined", maxChars);
}
