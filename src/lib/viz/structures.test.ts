import { describe, expect, it } from "vitest";
import { buildLevelOrderShape, buildNaryTreeShape, buildObjectTreeShape, collectListChain, hasChildrenShape, itemKeys, nodeColor, pickNodeValue } from "./structures";
import { arr, map, nul, num, obj, ref, str, table } from "./test-helpers";

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

  it("marks nodes whose prev points back at the previous node", () => {
    const doubly = table(obj(1, [["val", num(1)], ["prev", nul], ["next", ref(2)]]), obj(2, [["val", num(2)], ["prev", ref(1)], ["next", nul]]));
    expect(collectListChain(doubly, 1, 10).nodes.map((node) => node.isLinkedBack)).toEqual([false, true]);
    const single = table(obj(1, [["val", num(1)], ["next", ref(2)]]), obj(2, [["val", num(2)], ["next", nul]]));
    expect(collectListChain(single, 1, 10).nodes.map((node) => node.isLinkedBack)).toEqual([false, false]);
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

describe("nodeColor", () => {
  it("reads R/red and B/black from a primitive color field", () => {
    expect(nodeColor(obj(1, [["color", str("R")]]) as never)).toBe("red");
    expect(nodeColor(obj(1, [["color", str("Red")]]) as never)).toBe("red");
    expect(nodeColor(obj(1, [["color", str("black")]]) as never)).toBe("black");
    expect(nodeColor(obj(1, [["color", str("B")]]) as never)).toBe("black");
  });

  it("ignores other colours, non-strings and missing fields", () => {
    expect(nodeColor(obj(1, [["color", str("green")]]) as never)).toBeNull();
    expect(nodeColor(obj(1, [["color", num(1)]]) as never)).toBeNull();
    expect(nodeColor(obj(1, [["val", num(1)]]) as never)).toBeNull();
  });

  it("is carried on binary tree shape nodes", () => {
    const objects = table(obj(1, [["val", num(1)], ["color", str("B")], ["left", ref(2)]]), obj(2, [["val", num(0)], ["color", str("R")]]));
    expect(buildObjectTreeShape(objects, 1, 10).nodes.map((node) => node.color)).toEqual(["black", "red"]);
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

  it("labels red-black nodes with their colour", () => {
    const colored = table(
      obj(1, [["val", num(20)], ["color", str("B")], ["left", ref(2)], ["right", nul]]),
      obj(2, [["val", num(12)], ["color", str("R")], ["left", nul], ["right", nul]]),
    );
    const shape = buildObjectTreeShape(colored, 1, 10);
    expect(shape.nodes.map((node) => node.value)).toEqual([str("20:B"), str("12:R")]);
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

describe("buildNaryTreeShape", () => {
  const ternary = table(
    obj(1, [["val", num(1)], ["children", ref(10)]]),
    arr(10, [ref(2), ref(3), ref(4)]),
    obj(2, [["val", num(2)], ["children", ref(11)]]),
    arr(11, [ref(5)]),
    obj(3, [["val", num(3)], ["children", ref(12)]]),
    arr(12, []),
    obj(4, [["val", num(4)], ["children", ref(12)]]),
    obj(5, [["val", num(5)], ["children", ref(12)]]),
  );

  it("walks breadth first over a children array", () => {
    const shape = buildNaryTreeShape(ternary, 1, 10);
    expect(shape.nodes.map((node) => node.key)).toEqual(["o1", "o2", "o3", "o4", "o5"]);
    expect(shape.nodes[0].value).toEqual(num(1));
    expect(shape.children).toEqual([[1, 2, 3], [4], [], [], []]);
    expect(shape.edgeLabels[0]).toEqual([null, null, null]);
    expect(shape.isTruncated).toBe(false);
  });

  it("labels B-tree nodes with their joined keys", () => {
    const btree = table(
      obj(1, [["keys", ref(10)], ["children", ref(11)], ["leaf", { k: "boolean", v: false }]]),
      arr(10, [num(20)]),
      arr(11, [ref(2), ref(3)]),
      obj(2, [["keys", ref(12)], ["children", ref(14)], ["leaf", { k: "boolean", v: true }]]),
      arr(12, [num(5), num(10)]),
      obj(3, [["keys", ref(13)], ["children", ref(14)], ["leaf", { k: "boolean", v: true }]]),
      arr(13, [num(30), num(40)]),
      arr(14, []),
    );
    const shape = buildNaryTreeShape(btree, 1, 10);
    expect(shape.nodes.map((node) => node.value)).toEqual([str("20"), str("5,10"), str("30,40")]);
  });

  it("handles a single node and a missing root", () => {
    const single = table(obj(1, [["val", num(1)], ["children", ref(2)]]), arr(2, []));
    expect(buildNaryTreeShape(single, 1, 5).children).toEqual([[]]);
    expect(buildNaryTreeShape(single, 99, 5).nodes).toEqual([]);
  });

  it("labels trie edges from an object of children", () => {
    const trie = table(
      obj(1, [["children", ref(10)], ["isEnd", { k: "boolean", v: false }]]),
      obj(10, [["a", ref(2)], ["b", ref(3)]]),
      obj(2, [["children", ref(11)], ["isEnd", { k: "boolean", v: true }]]),
      obj(11, []),
      obj(3, [["children", ref(11)], ["isEnd", { k: "boolean", v: true }]]),
    );
    const shape = buildNaryTreeShape(trie, 1, 10);
    expect(shape.children).toEqual([[1, 2], [], []]);
    expect(shape.edgeLabels[0]).toEqual(["a", "b"]);
    expect(shape.nodes[0].value).toBeNull();
  });

  it("labels trie edges from a Map of children", () => {
    const trie = table(
      obj(1, [["children", ref(10)]]),
      map(10, [[str("x"), ref(2)], [num(7), ref(3)]]),
      obj(2, [["children", ref(11)]]),
      obj(3, [["children", ref(11)]]),
      map(11, []),
    );
    const shape = buildNaryTreeShape(trie, 1, 10);
    expect(shape.children[0]).toEqual([1, 2]);
    expect(shape.edgeLabels[0]).toEqual(["x", "7"]);
  });

  it("flags truncation at the node cap and keeps labels aligned", () => {
    const shape = buildNaryTreeShape(ternary, 1, 3);
    expect(shape.nodes).toHaveLength(3);
    expect(shape.isTruncated).toBe(true);
    shape.children.forEach((kids, index) => expect(shape.edgeLabels[index]).toHaveLength(kids.length));
  });

  it("ignores cycles and shared children", () => {
    const cyclic = table(
      obj(1, [["val", num(1)], ["children", ref(10)]]),
      arr(10, [ref(2), ref(2)]),
      obj(2, [["val", num(2)], ["children", ref(11)]]),
      arr(11, [ref(1)]),
    );
    const shape = buildNaryTreeShape(cyclic, 1, 10);
    expect(shape.children).toEqual([[1], []]);
    expect(shape.isTruncated).toBe(false);
  });
});

describe("hasChildrenShape", () => {
  const objects = table(
    arr(10, [ref(2)]),
    arr(11, []),
    arr(12, [num(1)]),
    obj(20, [["a", ref(2)]]),
    obj(21, [["a", num(1)]]),
    map(22, [[str("a"), ref(2)]]),
    obj(2, []),
  );

  it("accepts children arrays, empty arrays, and key -> node objects or maps", () => {
    expect(hasChildrenShape(objects, obj(1, [["children", ref(10)]]))).toBe(true);
    expect(hasChildrenShape(objects, obj(1, [["children", ref(11)]]))).toBe(true);
    expect(hasChildrenShape(objects, obj(1, [["children", ref(20)]]))).toBe(true);
    expect(hasChildrenShape(objects, obj(1, [["children", ref(22)]]))).toBe(true);
  });

  it("rejects binary nodes, primitive children and non-objects", () => {
    expect(hasChildrenShape(objects, obj(1, [["val", num(1)], ["left", ref(2)], ["right", nul]]))).toBe(false);
    expect(hasChildrenShape(objects, obj(1, [["children", ref(12)]]))).toBe(false);
    expect(hasChildrenShape(objects, obj(1, [["children", ref(21)]]))).toBe(false);
    expect(hasChildrenShape(objects, obj(1, [["children", nul]]))).toBe(false);
    expect(hasChildrenShape(objects, arr(30, [ref(2)]))).toBe(false);
  });
});
