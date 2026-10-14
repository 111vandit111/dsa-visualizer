import { describe, expect, it } from "vitest";
import { buildLevelOrderShape, buildObjectTreeShape, collectListChain, itemKeys, pickNodeValue } from "./structures";
import { nul, num, obj, ref, str, table } from "./test-helpers";

describe("pickNodeValue", () => {
  it("prefers val, then other known fields, then the first primitive", () => {
    expect(pickNodeValue(obj(1, [["next", nul], ["val", num(3)]]) as never)).toEqual(num(3));
    expect(pickNodeValue(obj(1, [["next", nul], ["weight", num(4)]]) as never)).toEqual(num(4));
    expect(pickNodeValue(obj(1, [["next", nul]]) as never)).toBeNull();
  });
});

describe("collectListChain", () => {
  it("follows next pointers to null", () => {
    const objects = table(obj(1, [["val", num(1)], ["next", ref(2)]]), obj(2, [["val", num(2)], ["next", nul]]));
    const chain = collectListChain(objects, 1, 10);
    expect(chain.nodes.map((node) => node.objectId)).toEqual([1, 2]);
    expect(chain.end).toBe("null");
  });

  it("detects cycles and honours the node cap", () => {
    const cyclic = table(obj(1, [["val", num(1)], ["next", ref(2)]]), obj(2, [["val", num(2)], ["next", ref(1)]]));
    expect(collectListChain(cyclic, 1, 10)).toMatchObject({ end: "cycle", cycleTo: 1 });
    expect(collectListChain(cyclic, 1, 1).end).toBe("truncated");
  });

  it("reports an unknown end for dangling pointers", () => {
    expect(collectListChain(table(obj(1, [["next", ref(9)]])), 1, 5).end).toBe("unknown");
    expect(collectListChain(table(), 1, 5).nodes).toEqual([]);
  });
});

describe("buildObjectTreeShape", () => {
  const objects = table(
    obj(1, [["val", num(1)], ["left", ref(2)], ["right", ref(3)]]),
    obj(2, [["val", num(2)], ["left", nul], ["right", nul]]),
    obj(3, [["val", num(3)], ["left", ref(1)], ["right", nul]]),
  );

  it("walks breadth first and ignores back-pointers", () => {
    const shape = buildObjectTreeShape(objects, 1, 10);
    expect(shape.nodes.map((node) => node.objectId)).toEqual([1, 2, 3]);
    expect(shape.children[0]).toEqual([1, 2]);
    expect(shape.children[2]).toEqual([null, null]);
    expect(shape.isTruncated).toBe(false);
  });

  it("caps the number of nodes", () => {
    const shape = buildObjectTreeShape(objects, 1, 2);
    expect(shape.nodes).toHaveLength(2);
    expect(shape.isTruncated).toBe(true);
  });
});

describe("buildLevelOrderShape", () => {
  it("builds LeetCode level-order arrays with null gaps", () => {
    const items = [num(3), num(9), num(20), nul, nul, num(15), num(7)];
    const shape = buildLevelOrderShape(items, 63);
    expect(shape.nodes.map((node) => node.value)).toEqual([num(3), num(9), num(20), num(15), num(7)]);
    expect(shape.children[0]).toEqual([1, 2]);
    expect(shape.children[1]).toEqual([null, null]);
    expect(shape.children[2]).toEqual([3, 4]);
  });

  it("returns an empty tree for an empty or null-rooted array", () => {
    expect(buildLevelOrderShape([], 10).nodes).toEqual([]);
    expect(buildLevelOrderShape([nul, str("x")], 10).nodes).toEqual([]);
  });
});

describe("itemKeys", () => {
  it("keys refs by identity and primitives by position, and keeps keys unique", () => {
    expect(itemKeys([num(1), ref(7), num(1), ref(7)])).toEqual(["i0", "o7", "i2", "o7-3"]);
  });
});
