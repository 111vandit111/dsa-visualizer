import { describe, expect, it } from "vitest";
import { detectRenderType } from "./detect";
import { arr, heap, map, nul, num, obj, ref, set, str, table } from "./test-helpers";

describe("detectRenderType", () => {
  it("detects containers by kind", () => {
    const objects = table(heap(1, [num(1)]), set(2, [num(1)]), map(3, []), arr(4, [num(1), num(2)]));
    expect(detectRenderType(objects, ref(1))).toBe("heap");
    expect(detectRenderType(objects, ref(2))).toBe("set");
    expect(detectRenderType(objects, ref(3))).toBe("map");
    expect(detectRenderType(objects, ref(4))).toBe("array");
  });

  it("treats plain objects and class instances as maps", () => {
    const objects = table(obj(1, [["a", num(1)]]), obj(2, [["count", num(0)]], "Twitter"));
    expect(detectRenderType(objects, ref(1))).toBe("map");
    expect(detectRenderType(objects, ref(2))).toBe("map");
  });

  it("detects a grid only for equal-length rows", () => {
    const rect = table(arr(1, [ref(2), ref(3)]), arr(2, [num(1), num(2)]), arr(3, [num(3), num(4)]));
    expect(detectRenderType(rect, ref(1))).toBe("grid");
    const ragged = table(arr(1, [ref(2), ref(3)]), arr(2, [num(1), num(2)]), arr(3, [num(3)]));
    expect(detectRenderType(ragged, ref(1))).toBe("array");
    const mixed = table(arr(1, [ref(2), num(5)]), arr(2, [num(1)]));
    expect(detectRenderType(mixed, ref(1))).toBe("array");
    const emptyRows = table(arr(1, [ref(2)]), arr(2, []));
    expect(detectRenderType(emptyRows, ref(1))).toBe("array");
  });

  it("detects linked lists and trees by their pointer fields", () => {
    const list = table(obj(1, [["val", num(1)], ["next", ref(2)]]), obj(2, [["val", num(2)], ["next", nul]]));
    expect(detectRenderType(list, ref(1))).toBe("linkedlist");
    const tree = table(obj(1, [["val", num(1)], ["left", ref(2)], ["right", nul]]), obj(2, [["val", num(0)], ["left", nul], ["right", nul]]));
    expect(detectRenderType(tree, ref(1))).toBe("tree");
    const notALink = table(obj(1, [["next", num(5)]]));
    expect(detectRenderType(notALink, ref(1))).toBe("map");
  });

  it("lets a compatible hint override detection", () => {
    const objects = table(arr(1, [num(3), num(1), num(2)]), obj(2, [["a", num(1)]]));
    expect(detectRenderType(objects, ref(1), "heap")).toBe("heap");
    expect(detectRenderType(objects, ref(1), "tree")).toBe("tree");
    expect(detectRenderType(objects, ref(1), "set")).toBe("set");
    expect(detectRenderType(objects, ref(2), "map")).toBe("map");
  });

  it("ignores a hint the object cannot satisfy", () => {
    const objects = table(set(1, [num(1)]), obj(2, [["a", num(1)]]), arr(3, [num(1)]));
    expect(detectRenderType(objects, ref(1), "heap")).toBe("set");
    expect(detectRenderType(objects, ref(2), "tree")).toBe("map");
    expect(detectRenderType(objects, ref(2), "linkedlist")).toBe("map");
    expect(detectRenderType(objects, ref(3), "grid")).toBe("array");
    expect(detectRenderType(objects, ref(3), "map")).toBe("array");
  });

  it("returns null for a ref that does not resolve", () => {
    expect(detectRenderType(table(), ref(9))).toBeNull();
    expect(detectRenderType(table(), ref(9), "heap")).toBeNull();
  });

  it("honours bars and graph hints only for compatible shapes", () => {
    const objects = table(
      arr(1, [num(3), num(1), num(2)]),
      arr(2, [num(1), str("x")]),
      arr(3, [ref(4), ref(5)]),
      arr(4, [num(1)]),
      arr(5, [num(0)]),
      arr(6, []),
    );
    expect(detectRenderType(objects, ref(1), "bars")).toBe("bars");
    expect(detectRenderType(objects, ref(2), "bars")).toBe("array");
    expect(detectRenderType(objects, ref(6), "bars")).toBe("array");
    expect(detectRenderType(objects, ref(3), "graph")).toBe("graph");
    expect(detectRenderType(objects, ref(1), "graph")).toBe("array");
  });

  it("uses the name hint to accept a look-alike graph hint", () => {
    const objects = table(arr(1, [ref(2), ref(3)]), arr(2, [num(1), num(1)]), arr(3, [num(0), num(0)]));
    expect(detectRenderType(objects, ref(1), "graph", "graph")).toBe("graph");
  });

  it("accepts the tree hint for objects with a children shape", () => {
    const objects = table(obj(1, [["val", num(1)], ["children", ref(2)]]), arr(2, [ref(3)]), obj(3, [["val", num(2)], ["children", ref(4)]]), arr(4, []));
    expect(detectRenderType(objects, ref(1), "tree")).toBe("tree");
    expect(detectRenderType(objects, ref(1))).toBe("tree");
  });

  it("auto-detects node objects with a neighbours list as graphs", () => {
    const objects = table(
      obj(1, [["val", num(1)], ["neighbors", ref(11)]], "Node"),
      obj(2, [["val", num(2)], ["neighbors", ref(12)]], "Node"),
      arr(11, [ref(2)]),
      arr(12, [ref(1)]),
    );
    expect(detectRenderType(objects, ref(1))).toBe("graph");
  });

  it("keeps a linked-list or binary node out of the graph rule", () => {
    const objects = table(obj(1, [["val", num(1)], ["next", ref(2)], ["neighbors", ref(11)]]), obj(2, [["val", num(2)], ["next", nul], ["neighbors", ref(12)]]), arr(11, [ref(2)]), arr(12, [ref(1)]));
    expect(detectRenderType(objects, ref(1))).toBe("linkedlist");
  });
});
