import { describe, expect, it } from "vitest";
import type { SValue, Trace, TraceFrame, TraceStep } from "@/lib/tracer/types";
import { buildPathModel, resolvePathNodes } from "./paths";
import { arr, frame, num, nul, obj, ref, set, step, str, table, map } from "./test-helpers";
import type { ObjectTable } from "./types";

const NO_INDEX_NAMES: ReadonlySet<string> = new Set();
const bool = (v: boolean): SValue => ({ k: "boolean", v });

function traceOf(...steps: TraceStep[]): Trace {
  return { caseIndex: 0, steps, isTruncated: false };
}

const treeObjects: ObjectTable = table(
  obj(1, [["val", num(1)], ["left", ref(2)], ["right", nul]]),
  obj(2, [["val", num(2)], ["left", ref(3)], ["right", nul]]),
  obj(3, [["val", num(3)], ["left", nul], ["right", nul]]),
);

const dfs = (id: number, nodeId: number | null): TraceFrame => frame(id, [["root", nodeId === null ? nul : ref(nodeId)]], undefined, "dfs");

describe("call-stack paths", () => {
  it("turns a recursion family on a tree into one point per frame", () => {
    const model = buildPathModel(traceOf(step(0, [dfs(1, 1), dfs(2, 2), dfs(3, 3)], treeObjects)), 2, NO_INDEX_NAMES);
    const [sequence] = model.at(0).sequences;
    expect(model.at(0).sequences).toHaveLength(1);
    expect(sequence).toMatchObject({ name: "dfs", source: "call-stack", isActive: true, slot: 2 });
    expect(sequence.points).toEqual([[ref(1)], [ref(2)], [ref(3)]]);
  });

  it("stops at a null node", () => {
    const model = buildPathModel(traceOf(step(0, [dfs(1, 1), dfs(2, 2), dfs(3, null)], treeObjects)), 0, NO_INDEX_NAMES);
    expect(model.at(0).sequences[0].points).toEqual([[ref(1)], [ref(2)]]);
  });

  it("makes (row, col) tuples from index-named integers", () => {
    const grid = (id: number, r: number, c: number) => frame(id, [["grid", ref(9)], ["r", num(r)], ["c", num(c)]], undefined, "dfs");
    const objects = table(arr(9, []));
    const model = buildPathModel(traceOf(step(0, [grid(1, 0, 0), grid(2, 0, 1), grid(3, 1, 1)], objects)), 0, new Set(["r", "c"]));
    expect(model.at(0).sequences[0].points).toEqual([[num(0), num(0)], [num(0), num(1)], [num(1), num(1)]]);
  });

  it("ignores integers that are not index names and families of one frame", () => {
    const plain = (id: number, n: number) => frame(id, [["n", num(n)]], undefined, "fib");
    expect(buildPathModel(traceOf(step(0, [plain(1, 3), plain(2, 2)], table())), 0, NO_INDEX_NAMES).at(0).sequences).toEqual([]);
    expect(buildPathModel(traceOf(step(0, [dfs(1, 1)], treeObjects)), 0, NO_INDEX_NAMES).at(0).sequences).toEqual([]);
  });

  it("skips the top level and marks a family that is not innermost as inactive", () => {
    const top = frame(0, [["root", ref(1)]], undefined, "(top level)");
    const helper = frame(9, [], undefined, "helper");
    const model = buildPathModel(traceOf(step(0, [top, dfs(1, 1), dfs(2, 2), helper], treeObjects)), 0, NO_INDEX_NAMES);
    expect(model.at(0).sequences).toHaveLength(1);
    expect(model.at(0).sequences[0].isActive).toBe(false);
  });

  it("gives two recursive functions different slots, stable across steps", () => {
    const other = (id: number, nodeId: number) => frame(id, [["node", ref(nodeId)]], undefined, "walk");
    const model = buildPathModel(
      traceOf(
        step(0, [dfs(1, 1), dfs(2, 2)], treeObjects),
        step(1, [dfs(1, 1), dfs(2, 2), other(5, 1), other(6, 2)], treeObjects),
        step(2, [other(5, 1), other(6, 2)], treeObjects),
      ),
      1,
      NO_INDEX_NAMES,
    );
    expect(model.at(0).sequences.map((s) => s.slot)).toEqual([1]);
    expect(model.at(1).sequences.map((s) => [s.name, s.slot])).toEqual([["dfs", 1], ["walk", 2]]);
    expect(model.at(2).sequences.map((s) => [s.name, s.slot])).toEqual([["walk", 2]]);
    expect(model.slotCount).toBe(3);
  });

  it("ignores captured outer variables and body locals of a nested helper", () => {
    const outer = (extra: [string, SValue][]): [string, SValue][] => [["next", num(5)], ["root", ref(1)], ...extra];
    const inner = (id: number, nodeId: number, extra: [string, SValue][] = []) =>
      frame(id, outer([["node", ref(nodeId)], ["path", ref(9)], ...extra]), undefined, "dfs");
    const objects = { ...treeObjects, ...table(arr(9, [])) };
    const model = buildPathModel(
      traceOf(
        step(0, [frame(0, outer([]), undefined, "main"), inner(1, 1)], objects),
        step(1, [frame(0, outer([]), undefined, "main"), inner(1, 1, [["child", ref(2)]]), inner(2, 2)], objects),
        step(2, [frame(0, outer([]), undefined, "main"), inner(1, 1, [["child", ref(2)]]), inner(2, 2, [["child", ref(3)]]), inner(3, 3)], objects),
      ),
      0,
      new Set(["next"]),
    );
    expect(model.at(2).sequences[0].points).toEqual([[ref(1)], [ref(2)], [ref(3)]]);
    expect(model.at(1).sequences[0].points).toEqual([[ref(1)], [ref(2)]]);
  });

  it("uses shadowing index parameters that vary between frames and skips constant captured ones", () => {
    const grid = (id: number, r: number, c: number) =>
      frame(id, [["count", num(1)], ["r", num(r)], ["c", num(c)]], undefined, "dfs");
    const model = buildPathModel(
      traceOf(step(0, [grid(1, 0, 0)], table()), step(1, [grid(1, 0, 0), grid(2, 1, 0)], table()), step(2, [grid(1, 0, 0), grid(2, 1, 0), grid(3, 1, 1)], table())),
      0,
      new Set(["r", "c", "count"]),
    );
    expect(model.at(2).sequences[0].points).toEqual([[num(0), num(0)], [num(1), num(0)], [num(1), num(1)]]);
  });

  it("keeps only the last maxPathPoints stops", () => {
    const ids = Array.from({ length: 70 }, (_, k) => k + 1);
    const objects = table(...ids.map((id) => obj(id, [["val", num(id)]])));
    const frames = ids.map((id) => dfs(id, id));
    const [sequence] = buildPathModel(traceOf(step(0, frames, objects)), 0, NO_INDEX_NAMES).at(0).sequences;
    expect(sequence.points).toHaveLength(64);
    expect(sequence.points[63]).toEqual([ref(70)]);
  });
});

describe("array and collection paths", () => {
  it("reads a path array of node refs or primitives from the innermost frame", () => {
    const objects = table(arr(5, [num(0), num(2), num(3)]), arr(6, [num(9)]));
    const model = buildPathModel(
      traceOf(step(0, [frame(1, [["path", ref(6)]]), frame(2, [["path", ref(5)], ["curPath", nul]])], objects)),
      0,
      NO_INDEX_NAMES,
    );
    const [sequence] = model.at(0).sequences;
    expect(sequence).toMatchObject({ name: "path", source: "array", isActive: true });
    expect(sequence.points).toEqual([[num(0)], [num(2)], [num(3)]]);
  });

  it("ignores arrays that are not path-like or are empty", () => {
    const objects = table(arr(5, [bool(true)]), arr(6, []), arr(7, [num(1)]));
    const model = buildPathModel(traceOf(step(0, [frame(1, [["path", ref(5)], ["route", ref(6)], ["nums", ref(7)]])], objects)), 0, NO_INDEX_NAMES);
    expect(model.at(0).sequences).toEqual([]);
  });

  it("splits a collection of paths into name[k] sequences with their own slots", () => {
    const objects = table(arr(1, [ref(2), ref(3)]), arr(2, [num(1), num(2)]), arr(3, [num(1), num(3)]), arr(4, [num(1)]));
    const model = buildPathModel(
      traceOf(step(0, [frame(1, [["res", ref(1)]])], objects), step(1, [frame(1, [["path", ref(4)], ["res", ref(1)]])], objects)),
      0,
      NO_INDEX_NAMES,
    );
    expect(model.at(0).sequences.map((s) => [s.name, s.slot, s.source])).toEqual([["res[0]", 0, "collection"], ["res[1]", 1, "collection"]]);
    expect(model.at(1).sequences.map((s) => [s.name, s.slot])).toEqual([["path", 2], ["res[0]", 0], ["res[1]", 1]]);
  });

  it("caps the number of sequences", () => {
    const inner = Array.from({ length: 9 }, (_, k) => arr(10 + k, [num(k)]));
    const objects = table(arr(1, inner.map((a) => ref(a.id))), ...inner);
    const model = buildPathModel(traceOf(step(0, [frame(1, [["paths", ref(1)]])], objects)), 0, NO_INDEX_NAMES);
    expect(model.at(0).sequences).toHaveLength(6);
    expect(model.slotCount).toBe(6);
  });

  it("does not treat a flat result array as a collection", () => {
    const objects = table(arr(1, [num(1), num(2)]));
    expect(buildPathModel(traceOf(step(0, [frame(1, [["res", ref(1)]])], objects)), 0, NO_INDEX_NAMES).at(0).sequences).toEqual([]);
  });
});

describe("reach sets", () => {
  const reachOf = (objects: ObjectTable, name = "visited") =>
    buildPathModel(traceOf(step(0, [frame(1, [[name, ref(1)]])], objects)), 0, NO_INDEX_NAMES).at(0).reached;

  it("reads a Set", () => {
    expect(reachOf(table(set(1, [num(1), num(4)])))[0].points).toEqual([[num(1)], [num(4)]]);
  });

  it("reads a Map or object with truthy values", () => {
    expect(reachOf(table(map(1, [[num(1), bool(true)], [num(2), bool(false)]])))[0].points).toEqual([[num(1)]]);
    expect(reachOf(table(obj(1, [["3", bool(true)], ["b", bool(true)], ["4", bool(false)]])), "seen")[0].points).toEqual([[num(3)], [str("b")]]);
  });

  it("reads a boolean array as indices", () => {
    expect(reachOf(table(arr(1, [bool(false), bool(true), bool(true)])))[0].points).toEqual([[num(1)], [num(2)]]);
  });

  it("reads a boolean 2D array as [row, col]", () => {
    const objects = table(arr(1, [ref(2), ref(3)]), arr(2, [bool(true), bool(false)]), arr(3, [bool(false), bool(true)]));
    expect(reachOf(objects)[0].points).toEqual([[num(0), num(0)], [num(1), num(1)]]);
  });

  it("skips empty or all-false sets and matches inStack / onPath", () => {
    expect(reachOf(table(set(1, [])))).toEqual([]);
    expect(reachOf(table(arr(1, [bool(false)])))).toEqual([]);
    expect(reachOf(table(set(1, [num(1)])), "inStack")).toHaveLength(1);
    expect(reachOf(table(set(1, [num(1)])), "onPath")).toHaveLength(1);
  });

  it("treats a visiting Set, and onStack, as reach sets; a visiting array stays a path", () => {
    expect(reachOf(table(set(1, [num(2)])), "visiting")[0].points).toEqual([[num(2)]]);
    expect(reachOf(table(set(1, [num(2)])), "onStack")).toHaveLength(1);
    const objects = table(arr(1, [num(0), num(1)]));
    const model = buildPathModel(traceOf(step(0, [frame(1, [["visiting", ref(1)]])], objects)), 0, NO_INDEX_NAMES).at(0);
    expect(model.reached).toEqual([]);
    expect(model.sequences[0]).toMatchObject({ name: "visiting", source: "array" });
  });

  it("caps the points", () => {
    const items = Array.from({ length: 250 }, (_, k) => num(k));
    expect(reachOf(table(set(1, items)))[0].points).toHaveLength(200);
  });

  it("gives reach sets stable slots alongside paths", () => {
    const objects = table(set(1, [num(1)]), arr(2, [num(1), num(2)]));
    const model = buildPathModel(
      traceOf(step(0, [frame(1, [["visited", ref(1)]])], objects), step(1, [frame(1, [["visited", ref(1)], ["path", ref(2)]])], objects)),
      3,
      NO_INDEX_NAMES,
    );
    expect(model.at(0).reached[0].slot).toBe(3);
    expect(model.at(1).reached[0].slot).toBe(3);
    expect(model.at(1).sequences[0].slot).toBe(4);
  });
});

describe("model", () => {
  it("returns empty paths for steps without any and out-of-range indices", () => {
    const model = buildPathModel(traceOf(step(0, [frame(1, [["x", num(1)]])], table())), 0, NO_INDEX_NAMES);
    expect(model.at(0)).toEqual({ sequences: [], reached: [] });
    expect(model.at(5)).toEqual({ sequences: [], reached: [] });
  });
});

describe("resolvePathNodes", () => {
  it("drops unresolved points and consecutive duplicates", () => {
    const lookup: Record<string, number> = { "1": 0, "2": 1, "3": 1 };
    const nodeIndexOf = (point: readonly SValue[]) => lookup[String((point[0] as { v?: number }).v)] ?? null;
    expect(resolvePathNodes([[num(1)], [num(2)], [num(3)], [num(9)], [num(1)]], nodeIndexOf)).toEqual([0, 1, 0]);
    expect(resolvePathNodes([], nodeIndexOf)).toEqual([]);
  });
});
