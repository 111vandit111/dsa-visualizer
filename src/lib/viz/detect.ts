import type { SObject, SRef, SValue, VisualHintType } from "@/lib/tracer/types";
import type { ObjectTable, RenderType } from "./types";

const NEXT_FIELD = "next";
const TREE_FIELDS = ["left", "right"] as const;

function entryValue(object: Extract<SObject, { k: "object" }>, name: string): SValue | undefined {
  return object.entries.find(([entryName]) => entryName === name)?.[1];
}

function isLink(value: SValue | undefined): boolean {
  return value !== undefined && (value.k === "ref" || value.k === "null");
}

function hasLinkedListShape(object: Extract<SObject, { k: "object" }>): boolean {
  return isLink(entryValue(object, NEXT_FIELD));
}

function hasTreeShape(object: Extract<SObject, { k: "object" }>): boolean {
  const present = TREE_FIELDS.map((name) => entryValue(object, name)).filter((value) => value !== undefined);
  return present.length > 0 && present.every(isLink);
}

function rowsOf(objects: ObjectTable, array: Extract<SObject, { k: "array" }>): Extract<SObject, { k: "array" }>[] | null {
  const rows: Extract<SObject, { k: "array" }>[] = [];
  for (const item of array.items) {
    const row = item.k === "ref" ? objects[item.id] : undefined;
    if (row?.k !== "array") return null;
    rows.push(row);
  }
  return rows;
}

function isArrayOfArrays(objects: ObjectTable, array: Extract<SObject, { k: "array" }>): boolean {
  const rows = array.items.length > 0 ? rowsOf(objects, array) : null;
  return rows !== null;
}

/** Array of one or more arrays that all have the same, non-zero length. */
function isRectangular(objects: ObjectTable, array: Extract<SObject, { k: "array" }>): boolean {
  const rows = array.items.length > 0 ? rowsOf(objects, array) : null;
  if (!rows) return false;
  const width = rows[0].length;
  return width > 0 && rows.every((row) => row.length === width);
}

function isHintCompatible(objects: ObjectTable, object: SObject, hint: VisualHintType): boolean {
  switch (hint) {
    case "heap":
      return object.k === "heap" || object.k === "array";
    case "tree":
      return object.k === "array" || (object.k === "object" && hasTreeShape(object));
    case "array":
      return object.k === "array" || object.k === "heap" || object.k === "set";
    case "grid":
      return object.k === "array" && isArrayOfArrays(objects, object);
    case "map":
      return object.k === "object" || object.k === "map";
    case "set":
      return object.k === "set" || object.k === "array";
    case "linkedlist":
      return object.k === "array" || (object.k === "object" && hasLinkedListShape(object));
  }
}

function autoDetect(objects: ObjectTable, object: SObject): RenderType {
  switch (object.k) {
    case "heap":
      return "heap";
    case "set":
      return "set";
    case "map":
      return "map";
    case "array":
      return isRectangular(objects, object) ? "grid" : "array";
    case "object":
      if (hasLinkedListShape(object)) return "linkedlist";
      return hasTreeShape(object) ? "tree" : "map";
  }
}

/**
 * Picks how an object is drawn. A compatible `hint` wins; otherwise the shape decides.
 * Returns null when the ref does not resolve in `objects`.
 */
export function detectRenderType(objects: ObjectTable, ref: SRef, hint?: VisualHintType): RenderType | null {
  const object = objects[ref.id];
  if (!object) return null;
  if (hint && isHintCompatible(objects, object, hint)) return hint;
  return autoDetect(objects, object);
}
