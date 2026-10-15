import { describe, expect, it } from "vitest";
import type { SObject, SValue } from "@/lib/tracer/types";
import { detectRenderType } from "./detect";
import { buildGraphModel, graphNodeLabel, isGraphShaped } from "./graph-model";
import { objectHost } from "./overlay-types";
import { arr, heap, map, nul, num, obj, ref, set, str, table } from "./test-helpers";

/** Array of arrays: object 1 holds refs to rows 2... (row cells are plain values). */
function rowsTable(rows: SValue[][]) {
  const objects: SObject[] = [arr(1, rows.map((_, index) => ref(index + 2))), ...rows.map((row, index) => arr(index + 2, row))];
  return table(...objects);
}

const ints = (rows: number[][]): SValue[][] => rows.map((row) => row.map((value) => num(value)));
const edgeKeys = (model: { edges: { key: string }[] }): string[] => model.edges.map((edge) => edge.key);
const labels = (model: { nodes: { label: string }[] }): string[] => model.nodes.map((node) => node.label);

describe("adjacency list", () => {
  it("reads a symmetric list as one undirected edge per pair", () => {
    const model = buildGraphModel(rowsTable(ints([[1, 2], [0, 2], [0, 1]])), 1, "graph");
    expect(model).toMatchObject({ format: "adjacency-list", isDirected: false, isTruncated: false });
    expect(labels(model!)).toEqual(["0", "1", "2"]);
    expect(edgeKeys(model!)).toEqual(["0>1", "0>2", "1>2"]);
    expect(model!.nodes[1]).toEqual({ key: "n1", label: "1", targets: [{ host: objectHost(1), cellKey: "1" }] });
    expect(model!.nodeIndexOfValue(num(2))).toBe(2);
    expect(model!.nodeIndexOfValue(num(3))).toBeNull();
    expect(model!.nodeIndexOfValue(str("2"))).toBeNull();
  });

  it("keeps the direction of a directed list", () => {
    const model = buildGraphModel(rowsTable(ints([[1], [2], []])), 1);
    expect(model).toMatchObject({ format: "adjacency-list", isDirected: true });
    expect(edgeKeys(model!)).toEqual(["0>1", "1>2"]);
    expect(model!.edges[0]).toEqual({ key: "0>1", from: 0, to: 1, weight: null });
  });

  it("reads rows of [vertex, weight] pairs as a weighted graph", () => {
    const objects = table(
      arr(1, [ref(2), ref(3), ref(4)]),
      arr(2, [ref(5)]),
      arr(3, [ref(6), ref(7)]),
      arr(4, []),
      arr(5, [num(1), num(4)]),
      arr(6, [num(0), num(4)]),
      arr(7, [num(2), num(7)]),
    );
    const model = buildGraphModel(objects, 1);
    expect(model).toMatchObject({ format: "adjacency-list", isDirected: true });
    expect(model!.edges.map((edge) => [edge.key, edge.weight])).toEqual([["0>1", "4"], ["1>0", "4"], ["1>2", "7"]]);
  });

  it("keeps self loops and drops repeated edges", () => {
    const model = buildGraphModel(rowsTable(ints([[0, 1, 1], [0]])), 1, "adj");
    expect(edgeKeys(model!)).toEqual(["0>0", "0>1", "1>0"].filter((key) => key !== "1>0"));
    expect(model!.isDirected).toBe(false);
  });

  it("rejects rows whose values are not vertices or mix weighted and plain entries", () => {
    expect(buildGraphModel(rowsTable(ints([[1, 5], [0]])), 1, "graph")).toBeNull();
    expect(buildGraphModel(rowsTable([[num(1.5)], [num(0)]]), 1, "graph")).toBeNull();
    const mixed = table(arr(1, [ref(2), ref(3)]), arr(2, [num(1)]), arr(3, [ref(4)]), arr(4, [num(0), num(2)]));
    expect(buildGraphModel(mixed, 1, "graph")).toBeNull();
  });

  it("has no graph without edges unless the name says graph", () => {
    const empty = rowsTable([[], [], []]);
    expect(buildGraphModel(empty, 1)).toBeNull();
    expect(buildGraphModel(empty, 1, "adjList")).toMatchObject({ nodes: expect.any(Array), edges: [], isDirected: false });
    expect(buildGraphModel(empty, 1, "adjList")!.nodes).toHaveLength(3);
  });
});

describe("1-indexed adjacency lists", () => {
  it("reads clone-graph's [[2, 4], [1, 3], [2, 4], [1, 3]] as a 4-cycle, not as an edge list", () => {
    const model = buildGraphModel(rowsTable(ints([[2, 4], [1, 3], [2, 4], [1, 3]])), 1, "adjList");
    expect(model).toMatchObject({ format: "adjacency-list", isDirected: false });
    expect(labels(model!)).toEqual(["1", "2", "3", "4"]);
    expect(model!.nodes.map((node) => node.key)).toEqual(["n1", "n2", "n3", "n4"]);
    expect(edgeKeys(model!)).toEqual(["0>1", "0>3", "1>2", "2>3"]);
    expect(model!.nodes[0].targets).toEqual([{ host: objectHost(1), cellKey: "0" }]);
    expect(model!.nodeIndexOfValue(num(4))).toBe(3);
    expect(model!.nodeIndexOfValue(num(1))).toBe(0);
    expect(model!.nodeIndexOfValue(num(0))).toBeNull();
  });

  it("reads the two-node case [[2], [1]] as a graph too (no flip to a grid between cases)", () => {
    const model = buildGraphModel(rowsTable(ints([[2], [1]])), 1, "adjList");
    expect(model).toMatchObject({ format: "adjacency-list", isDirected: false });
    expect(labels(model!)).toEqual(["1", "2"]);
    expect(edgeKeys(model!)).toEqual(["0>1"]);
  });

  it("prefers the adjacency list when rows differ in length, even without a name", () => {
    expect(buildGraphModel(rowsTable(ints([[2, 3], [1], [1]])), 1)).toMatchObject({ format: "adjacency-list" });
  });

  it("keeps the 0-indexed reading when both fit, and reads weighted 1-indexed pairs", () => {
    const zeroBased = buildGraphModel(rowsTable(ints([[1], [2], [1]])), 1, "graph");
    expect(labels(zeroBased!)).toEqual(["0", "1", "2"]);
    const weighted = table(arr(1, [ref(2), ref(3)]), arr(2, [ref(4)]), arr(3, [ref(5)]), arr(4, [num(2), num(9)]), arr(5, [num(1), num(9)]));
    const model = buildGraphModel(weighted, 1, "graph");
    expect(model).toMatchObject({ format: "adjacency-list", isDirected: false });
    expect(model!.edges.map((edge) => [edge.key, edge.weight])).toEqual([["0>1", "9"]]);
    expect(labels(model!)).toEqual(["1", "2"]);
  });

  it("does not make an edge list out of it when the name says edges", () => {
    expect(buildGraphModel(rowsTable(ints([[1, 2], [2, 3], [3, 4]])), 1, "edges")).toMatchObject({ format: "edge-list" });
    expect(buildGraphModel(rowsTable(ints([[1, 2], [2, 3], [3, 4]])), 1)).toMatchObject({ format: "edge-list" });
  });
});

describe("adjacency matrix", () => {
  it("reads a symmetric 0/1 matrix, with row and column targets", () => {
    const model = buildGraphModel(rowsTable(ints([[0, 1, 0], [1, 0, 1], [0, 1, 0]])), 1);
    expect(model).toMatchObject({ format: "adjacency-matrix", isDirected: false });
    expect(edgeKeys(model!)).toEqual(["0>1", "1>2"]);
    expect(model!.nodes[1].targets).toEqual([
      { host: objectHost(1), cellKey: "1" },
      { host: objectHost(2), cellKey: "1" },
      { host: objectHost(3), cellKey: "1" },
      { host: objectHost(4), cellKey: "1" },
    ]);
    expect(model!.nodeIndexOfValue(num(2))).toBe(2);
  });

  it("is directed when an edge has no reverse", () => {
    const model = buildGraphModel(rowsTable(ints([[0, 1], [0, 0]])), 1);
    expect(model).toMatchObject({ format: "adjacency-matrix", isDirected: true });
    expect(edgeKeys(model!)).toEqual(["0>1"]);
  });

  it("accepts booleans, null and Infinity as no-edge markers, and weights", () => {
    const bools = rowsTable([[{ k: "boolean", v: false }, { k: "boolean", v: true }], [{ k: "boolean", v: true }, { k: "boolean", v: false }]]);
    expect(buildGraphModel(bools, 1)).toMatchObject({ format: "adjacency-matrix", isDirected: false });
    const inf = num(Infinity);
    const dist = rowsTable([[num(0), num(3), inf], [nul, num(0), num(2)], [num(1), inf, num(0)]]);
    const model = buildGraphModel(dist, 1);
    expect(model).toMatchObject({ format: "adjacency-matrix", isDirected: true });
    expect(model!.edges.map((edge) => [edge.key, edge.weight])).toEqual([["0>1", "3"], ["1>2", "2"], ["2>0", "1"]]);
  });

  it("rejects an all-zero matrix, a non-square table and a table of values with a non-zero diagonal", () => {
    expect(buildGraphModel(rowsTable(ints([[0, 0], [0, 0]])), 1)).toBeNull();
    expect(buildGraphModel(rowsTable(ints([[0, 1, 9, 9], [1, 0, 9, 9]])), 1, "graph")).toBeNull();
    expect(buildGraphModel(rowsTable(ints([[5, 9, 7], [8, 6, 4], [3, 2, 1]])), 1)).toBeNull();
    expect(buildGraphModel(rowsTable(ints([[1, 2], [3, 4]])), 1)).toBeNull();
    expect(buildGraphModel(rowsTable([[str("a"), str("b")], [str("c"), str("d")]]), 1)).toBeNull();
  });
});

describe("edge list", () => {
  it("reads [u, v] rows into sorted nodes without pointer targets", () => {
    const model = buildGraphModel(rowsTable(ints([[2, 0], [0, 1], [10, 2]])), 1);
    expect(model).toMatchObject({ format: "edge-list", isDirected: true });
    expect(labels(model!)).toEqual(["0", "1", "2", "10"]);
    expect(model!.nodes.every((node) => node.targets.length === 0)).toBe(true);
    expect(model!.edges.map((edge) => [edge.from, edge.to])).toEqual([[2, 0], [0, 1], [3, 2]]);
    expect(model!.nodeIndexOfValue(num(10))).toBe(3);
  });

  it("uses the name hint to read a square table as edges", () => {
    const rows = ints([[0, 1, 4], [1, 2, 6], [2, 0, 5]]);
    expect(buildGraphModel(rowsTable(rows), 1)).toBeNull();
    const model = buildGraphModel(rowsTable(rows), 1, "roads");
    expect(model).toMatchObject({ format: "edge-list" });
    expect(model!.edges.map((edge) => [edge.key, edge.weight])).toEqual([["0>1", "4"], ["1>2", "6"], ["2>0", "5"]]);
    expect(model!.isDirected).toBe(true);
  });

  it("supports string endpoints and folds mirrored pairs", () => {
    const model = buildGraphModel(rowsTable([[str("B"), str("A")], [str("A"), str("B")], [str("B"), str("C")]]), 1, "pairs");
    expect(model).toMatchObject({ format: "edge-list", isDirected: true });
    expect(labels(model!)).toEqual(["A", "B", "C"]);
    expect(model!.nodeIndexOfValue(str("B"))).toBe(1);
    expect(model!.nodeIndexOfValue(num(1))).toBeNull();
    const mirrored = buildGraphModel(rowsTable([[str("B"), str("A")], [str("A"), str("B")]]), 1, "edges");
    expect(mirrored).toMatchObject({ isDirected: false });
    expect(edgeKeys(mirrored!)).toEqual(["0>1"]);
  });

  it("takes non-square [vertex, vertex] rows as edges even without a hint", () => {
    expect(buildGraphModel(rowsTable(ints([[1, 2], [2, 3], [3, 1]])), 1)).toMatchObject({ format: "edge-list" });
    expect(buildGraphModel(rowsTable(ints([[0, 1], [1, 2], [2, 0]])), 1, "graph")).toMatchObject({ format: "adjacency-list" });
  });

  it("rejects rows with references or the wrong width", () => {
    expect(buildGraphModel(rowsTable([[ref(1), num(2)], [num(1), num(2)], [num(1), num(3)]]), 1, "edges")).toBeNull();
    expect(buildGraphModel(rowsTable(ints([[1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 3, 4]])), 1, "edges")).toBeNull();
  });
});

describe("node objects", () => {
  const nodes = (): SObject[] => [
    obj(1, [["val", num(1)], ["neighbors", ref(11)]], "Node"),
    obj(2, [["val", num(2)], ["neighbors", ref(12)]], "Node"),
    obj(3, [["val", num(3)], ["neighbors", ref(13)]], "Node"),
    arr(11, [ref(2), ref(3)]),
    arr(12, [ref(1), ref(3)]),
    arr(13, [ref(1), ref(2)]),
  ];

  it("walks cyclic neighbours breadth first and folds them into undirected edges", () => {
    const model = buildGraphModel(table(...nodes()), 1);
    expect(model).toMatchObject({ format: "node-objects", isDirected: false, isTruncated: false });
    expect(labels(model!)).toEqual(["1", "2", "3"]);
    expect(model!.nodes.map((node) => node.key)).toEqual(["o1", "o2", "o3"]);
    expect(model!.nodes[1].targets).toEqual([{ host: objectHost(2), cellKey: null }]);
    expect(edgeKeys(model!)).toEqual(["0>1", "0>2", "1>2"]);
  });

  it("finds a node by reference or by its unique value", () => {
    const model = buildGraphModel(table(...nodes()), 1)!;
    expect(model.nodeIndexOfValue(ref(3))).toBe(2);
    expect(model.nodeIndexOfValue(num(2))).toBe(1);
    expect(model.nodeIndexOfValue(ref(99))).toBeNull();
  });

  it("does not guess a node for a value that two nodes share", () => {
    const twin = table(
      obj(1, [["val", num(7)], ["neighbors", ref(11)]]),
      obj(2, [["val", num(7)], ["neighbors", ref(12)]]),
      arr(11, [ref(2)]),
      arr(12, []),
    );
    const model = buildGraphModel(twin, 1)!;
    expect(model.nodeIndexOfValue(num(7))).toBeNull();
    expect(model.nodeIndexOfValue(ref(2))).toBe(1);
    expect(model.isDirected).toBe(true);
  });

  it("labels value-less nodes by id and starts from any node", () => {
    const bare = table(obj(5, [["adj", ref(6)]]), obj(7, [["adj", ref(8)]]), arr(6, [ref(7)]), arr(8, []));
    expect(labels(buildGraphModel(bare, 5)!)).toEqual(["#5", "#7"]);
    expect(labels(buildGraphModel(bare, 7)!)).toEqual(["#7"]);
  });

  it("is not a graph for linked lists, trees, edge records or a lone node", () => {
    expect(buildGraphModel(table(obj(1, [["val", num(1)], ["next", ref(2)]]), obj(2, [["val", num(2)], ["next", nul]])), 1)).toBeNull();
    expect(buildGraphModel(table(obj(1, [["val", num(1)], ["left", ref(2)], ["right", nul]]), obj(2, [["val", num(2)], ["left", nul], ["right", nul]])), 1)).toBeNull();
    const records = table(obj(1, [["edges", ref(3)]]), obj(2, [["to", ref(1)], ["weight", num(4)]]), arr(3, [ref(2)]));
    expect(buildGraphModel(records, 1)).toBeNull();
  });

  it("counts a node whose neighbours list is still empty as a graph, so the view does not flicker", () => {
    const lone = table(obj(1, [["val", num(1)], ["neighbors", ref(2)]], "Node"), arr(2, []));
    expect(buildGraphModel(lone, 1)).toMatchObject({ format: "node-objects", edges: [], isDirected: false });
    expect(labels(buildGraphModel(lone, 1)!)).toEqual(["1"]);
    expect(buildGraphModel(table(obj(1, [["val", num(1)], ["adj", ref(2)]]), arr(2, [])), 1)).toMatchObject({ format: "node-objects" });
    const linked = table(obj(1, [["val", num(1)], ["neighbors", ref(3)]]), obj(2, [["val", num(2)], ["neighbors", ref(4)]]), arr(3, [ref(2)]), arr(4, []));
    expect(buildGraphModel(linked, 1)).toMatchObject({ format: "node-objects" });
    expect(labels(buildGraphModel(linked, 1)!)).toEqual(["1", "2"]);
  });

  it("is drawn as a graph by auto-detection from the first step (empty or not)", () => {
    const lone = table(obj(1, [["val", num(1)], ["neighbors", ref(2)]], "Node"), arr(2, []));
    expect(detectRenderType(lone, ref(1))).toBe("graph");
    expect(detectRenderType(lone, ref(1), undefined, "copy")).toBe("graph");
    expect(detectRenderType(table(obj(1, [["val", num(1)], ["tags", ref(2)]]), arr(2, [])), ref(1))).toBe("map");
  });

  it("does not treat other empty lists as an edge-less graph", () => {
    expect(buildGraphModel(table(obj(1, [["edges", ref(2)]]), arr(2, [])), 1)).toBeNull();
    expect(buildGraphModel(table(obj(1, [["links", ref(2)]]), arr(2, [])), 1)).toBeNull();
    expect(buildGraphModel(table(obj(1, [["items", ref(2)]]), arr(2, [])), 1)).toBeNull();
  });

  it("caps nodes and flags the truncation", () => {
    const count = 45;
    const all: SObject[] = [];
    for (let i = 0; i < count; i++) {
      all.push(obj(i + 1, [["val", num(i)], ["neighbors", ref(100 + i)]]));
      all.push(arr(100 + i, i + 1 < count ? [ref(i + 2)] : []));
    }
    const model = buildGraphModel(table(...all), 1)!;
    expect(model.nodes).toHaveLength(40);
    expect(model.edges).toHaveLength(39);
    expect(model.isTruncated).toBe(true);
  });
});

describe("arrays of node objects", () => {
  /** Clone-graph square: nodes 1-2-3-4-1 as { val, neighbors } objects 10..13, lists 20..23; array 1 holds them. */
  function square(items: SValue[]) {
    const ids = [10, 11, 12, 13];
    const node = (index: number) => obj(ids[index], [["val", num(index + 1)], ["neighbors", ref(20 + index)]]);
    const list = (index: number) => arr(20 + index, [ref(ids[(index + 1) % 4]), ref(ids[(index + 3) % 4])]);
    return table(arr(1, items), ...[0, 1, 2, 3].map(node), ...[0, 1, 2, 3].map(list));
  }

  it("draws one graph for an array holding every node, each node answering to its cell", () => {
    const objects = square([ref(10), ref(11), ref(12), ref(13)]);
    const model = buildGraphModel(objects, 1);
    expect(model).toMatchObject({ format: "node-objects", isDirected: false });
    expect(labels(model!)).toEqual(["1", "2", "3", "4"]);
    expect(model!.edges).toHaveLength(4);
    expect(model!.nodes[2].targets).toEqual([{ host: objectHost(12), cellKey: null }, { host: objectHost(1), cellKey: "2" }]);
    expect(detectRenderType(objects, ref(1), undefined, "list")).toBe("graph");
  });

  it("keeps a partial array of nodes (a BFS queue) as an array unless the name says nodes/graph", () => {
    const objects = square([ref(11), ref(13)]);
    expect(buildGraphModel(objects, 1, "queue")).toBeNull();
    expect(detectRenderType(objects, ref(1), undefined, "queue")).toBe("array");
    expect(buildGraphModel(objects, 1, "nodes")).toMatchObject({ format: "node-objects" });
    expect(detectRenderType(objects, ref(1), undefined, "nodes")).toBe("graph");
  });

  it("allows null slots and nodes whose neighbour lists are still empty", () => {
    const objects = table(arr(1, [ref(2), nul, ref(3)]), obj(2, [["val", num(1)], ["neighbors", ref(4)]]), obj(3, [["val", num(2)], ["neighbors", ref(5)]]), arr(4, []), arr(5, []));
    expect(buildGraphModel(objects, 1)).toMatchObject({ format: "node-objects", edges: [] });
    expect(buildGraphModel(table(arr(1, [ref(2), num(3)]), obj(2, [["val", num(1)], ["neighbors", ref(4)]]), arr(4, [])), 1)).toBeNull();
    expect(buildGraphModel(table(arr(1, [nul])), 1, "nodes")).toBeNull();
  });

  it("labels a single graph node object", () => {
    const objects = square([]);
    expect(graphNodeLabel(objects, 12)).toBe("3");
    expect(graphNodeLabel(table(obj(1, [["a", num(1)]])), 1)).toBeNull();
  });
});

describe("keyed graphs", () => {
  it("reads a Map of key -> neighbour list", () => {
    const objects = table(
      map(1, [[str("A"), ref(2)], [str("B"), ref(3)]]),
      arr(2, [str("B"), str("C")]),
      arr(3, [str("A")]),
    );
    const model = buildGraphModel(objects, 1);
    expect(model).toMatchObject({ format: "keyed", isDirected: true });
    expect(labels(model!)).toEqual(["A", "B", "C"]);
    expect(model!.nodes[0]).toEqual({ key: "kstring:A", label: "A", targets: [{ host: objectHost(1), cellKey: "string:A" }] });
    expect(model!.nodes[2].targets).toEqual([]);
    expect(edgeKeys(model!)).toEqual(["0>1", "0>2", "1>0"]);
    expect(model!.nodeIndexOfValue(str("C"))).toBe(2);
    expect(model!.nodeIndexOfValue(num(1))).toBeNull();
  });

  it("reads a plain object whose keys are numbers in text", () => {
    const objects = table(obj(1, [["1", ref(2)], ["2", ref(3)], ["3", ref(4)]]), arr(2, [num(2), num(3)]), arr(3, [num(1), num(3)]), set(4, [num(1)]));
    const model = buildGraphModel(objects, 1);
    expect(model).toMatchObject({ format: "keyed", isDirected: true });
    expect(labels(model!)).toEqual(["1", "2", "3"]);
    expect(model!.nodes[0].targets).toEqual([{ host: objectHost(1), cellKey: "1" }]);
    expect(model!.nodeIndexOfValue(num(2))).toBe(1);
    expect(model!.nodeIndexOfValue(str("2"))).toBe(1);
    expect(edgeKeys(model!)).toEqual(["0>1", "0>2", "1>0", "1>2", "2>0"]);
  });

  it("is not a graph when the lists are not made of the map's own keys", () => {
    const groups = table(map(1, [[str("aet"), ref(2)], [str("abt"), ref(3)]]), arr(2, [str("eat"), str("tea")]), arr(3, [str("bat")]));
    expect(buildGraphModel(groups, 1)).toBeNull();
    const indices = table(map(1, [[num(1), ref(2)], [num(2), ref(3)]]), arr(2, [num(0), num(3), num(4)]), arr(3, [num(5)]));
    expect(buildGraphModel(indices, 1)).toBeNull();
  });

  it("is not a graph for maps of scalars, mixed values or empty containers", () => {
    expect(buildGraphModel(table(map(1, [[str("a"), num(1)]])), 1)).toBeNull();
    expect(buildGraphModel(table(obj(1, [["a", num(1)]])), 1)).toBeNull();
    expect(buildGraphModel(table(map(1, [])), 1)).toBeNull();
    expect(buildGraphModel(table(obj(1, [["a", ref(2)]]), arr(2, [ref(1)])), 1)).toBeNull();
    expect(buildGraphModel(table(map(1, [[str("a"), ref(2)]]), arr(2, [])), 1)).toBeNull();
    expect(buildGraphModel(table(map(1, [[str("a"), ref(2)]]), arr(2, [])), 1, "graph")).toMatchObject({ format: "keyed", edges: [] });
  });
});

describe("limits and non-graphs", () => {
  it("caps the nodes of a long list", () => {
    const rows = Array.from({ length: 60 }, (_, index) => [(index + 1) % 60]);
    const model = buildGraphModel(rowsTable(ints(rows)), 1, "graph")!;
    expect(model.nodes).toHaveLength(40);
    expect(model.isTruncated).toBe(true);
    expect(model.edges.every((edge) => edge.from < 40 && edge.to < 40)).toBe(true);
  });

  it("caps the edges of a dense graph", () => {
    const count = 20;
    const rows = Array.from({ length: count }, (_, from) => Array.from({ length: count }, (__, to) => to).filter((to) => to !== from));
    const model = buildGraphModel(rowsTable(ints(rows)), 1, "graph")!;
    expect(model.isDirected).toBe(false);
    expect(model.edges).toHaveLength(120);
    expect(model.isTruncated).toBe(true);
  });

  it("caps the nodes of an edge list and a matrix", () => {
    const edges = Array.from({ length: 50 }, (_, index) => [index, index + 1]);
    const model = buildGraphModel(rowsTable(ints(edges)), 1, "edges")!;
    expect(model.nodes).toHaveLength(40);
    expect(model.isTruncated).toBe(true);
    const size = 45;
    const matrix = Array.from({ length: size }, (_, i) => Array.from({ length: size }, (__, j) => (Math.abs(i - j) === 1 ? 1 : 0)));
    const big = buildGraphModel(rowsTable(ints(matrix)), 1)!;
    expect(big).toMatchObject({ format: "adjacency-matrix", isTruncated: true });
    expect(big.nodes).toHaveLength(40);
  });

  it("returns null for anything that is not graph-shaped", () => {
    const objects = table(arr(1, [num(1), num(2), num(3)]), arr(2, []), set(3, [num(1)]), heap(4, [num(1)]), arr(5, [ref(6)]), obj(6, []), arr(7, [ref(8), num(1)]), arr(8, [num(0)]));
    for (const id of [1, 2, 3, 4, 5, 6, 7, 99]) expect(buildGraphModel(objects, id, "graph")).toBeNull();
    expect(isGraphShaped(objects, 1)).toBe(false);
  });

  it("reports graph shape through isGraphShaped", () => {
    const objects = rowsTable(ints([[1], [0]]));
    expect(isGraphShaped(objects, 1)).toBe(true);
    expect(isGraphShaped(objects, 2)).toBe(false);
  });
});
