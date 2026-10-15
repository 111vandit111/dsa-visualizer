import { describe, expect, it } from "vitest";
import type { SObject, SValue, Trace, TraceFrame, TraceStep } from "@/lib/tracer/types";
import { NULL_HOST, objectHost, stringHost } from "./overlay-types";
import { buildPointerModel, localNamesByObject } from "./pointers";
import { arr, frame, heap, map, nul, num, obj, ref, set, step, str, table } from "./test-helpers";

const trace = (steps: TraceStep[]): Trace => ({ caseIndex: 0, steps, isTruncated: false });
const names = (pointers: readonly { name: string }[]): string[] => pointers.map((pointer) => pointer.name);

function cpuMs(work: () => void): number {
  const before = process.cpuUsage();
  work();
  const used = process.cpuUsage(before);
  return (used.user + used.system) / 1000;
}

/** One-frame steps over the same heap, one per local list. */
function steps(objects: SObject[], ...localSets: [string, SValue][][]): TraceStep[] {
  return localSets.map((locals, index) => step(index, [frame(1, locals)], table(...objects)));
}

const NUMS = arr(1, [num(5), num(6), num(7)]);

describe("index pointers", () => {
  it("places i on nums[i] and marks the cell, with evidence from the code", () => {
    const model = buildPointerModel(trace(steps([NUMS], [["nums", ref(1)], ["i", num(2)]])), "return nums[i];");
    const pointers = model.at(0);
    expect(names(pointers.at(objectHost(1), "2"))).toEqual(["i"]);
    expect(pointers.at(objectHost(1), "1")).toEqual([]);
    expect(pointers.at(objectHost(1), null)).toEqual([]);
    expect(pointers.all[0]).toMatchObject({ name: "i", kind: "index", frameId: 1, isActive: true, isOutOfRange: false, value: num(2) });
    expect(model.indexVarNames.has("i")).toBe(true);
  });

  it("lists out-of-range positions separately from the cells", () => {
    const model = buildPointerModel(trace(steps([NUMS], [["nums", ref(1)], ["i", num(3)]], [["nums", ref(1)], ["i", num(-1)]])), "nums[i]");
    for (const index of [0, 1]) {
      const pointers = model.at(index);
      expect(names(pointers.outOfRange(objectHost(1)))).toEqual(["i"]);
      expect(names(pointers.all)).toEqual(["i"]);
      expect(pointers.all[0].isOutOfRange).toBe(true);
      for (const cell of ["-1", "0", "1", "2", "3"]) expect(pointers.at(objectHost(1), cell)).toEqual([]);
    }
  });

  it("ignores non-integer numbers and values that are not keys", () => {
    const model = buildPointerModel(
      trace(steps([NUMS], [["nums", ref(1)], ["i", num(1.5)], ["j", { k: "boolean", v: true }], ["k", { k: "undefined" }]])),
      "nums[i] + nums[j] + nums[k]",
    );
    expect(model.at(0).all).toEqual([]);
  });

  it("targets characters of a string local", () => {
    const stepList = [step(0, [frame(7, [["s", str("abc")], ["i", num(1)]])], table())];
    const pointers = buildPointerModel(trace(stepList), "s.charAt(i)").at(0);
    expect(names(pointers.at(stringHost(7, "s"), "1"))).toEqual(["i"]);
  });

  it("flags a string index past the end", () => {
    const stepList = [step(0, [frame(7, [["s", str("abc")], ["i", num(3)]])], table())];
    const pointers = buildPointerModel(trace(stepList), "s.charAt(i)").at(0);
    expect(names(pointers.outOfRange(stringHost(7, "s")))).toEqual(["i"]);
  });

  it("follows row variables through dp[i][j]", () => {
    const dp = arr(1, [ref(2), ref(3)]);
    const objects = [dp, arr(2, [num(0), num(0), num(0)]), arr(3, [num(0), num(0), num(0)])];
    const pointers = buildPointerModel(trace(steps(objects, [["dp", ref(1)], ["i", num(1)], ["j", num(2)]])), "dp[i][j] = dp[i - 1][j];").at(0);
    expect(names(pointers.at(objectHost(1), "1"))).toEqual(["i"]);
    expect(names(pointers.at(objectHost(3), "2"))).toEqual(["j"]);
    expect(pointers.at(objectHost(2), "2")).toEqual([]);
  });

  it("drops a pointer whose row variable is out of range", () => {
    const dp = arr(1, [ref(2)]);
    const objects = [dp, arr(2, [num(0), num(0)])];
    const pointers = buildPointerModel(trace(steps(objects, [["dp", ref(1)], ["i", num(5)], ["j", num(0)]])), "dp[i][j]").at(0);
    expect(names(pointers.all)).toEqual(["i"]);
    expect(pointers.all[0].isOutOfRange).toBe(true);
  });

  it("points a key at its map, object and set cells when the entry exists", () => {
    const objects = [
      map(1, [[str("a"), num(1)], [num(7), num(2)]]),
      obj(2, [["a", num(1)], ["7", num(2)]]),
      set(3, [str("a")]),
    ];
    const locals: [string, SValue][] = [["m", ref(1)], ["o", ref(2)], ["seen", ref(3)], ["ch", str("a")], ["n", num(7)], ["zz", str("zz")]];
    const code = "m.get(ch); m.get(n); o[ch]; o[n]; seen.has(ch); m.get(zz);";
    const pointers = buildPointerModel(trace(steps(objects, locals)), code).at(0);
    expect(names(pointers.at(objectHost(1), "string:a"))).toEqual(["ch"]);
    expect(names(pointers.at(objectHost(1), "number:7"))).toEqual(["n"]);
    expect(names(pointers.at(objectHost(2), "a"))).toEqual(["ch"]);
    expect(names(pointers.at(objectHost(2), "7"))).toEqual(["n"]);
    expect(names(pointers.at(objectHost(3), "string:a"))).toEqual(["ch"]);
    expect(pointers.all.some((pointer) => pointer.name === "zz")).toBe(false);
  });

  it("caps the bases of one name at three", () => {
    const objects = [arr(1, [num(0), num(0)]), arr(2, [num(0), num(0)]), arr(3, [num(0), num(0)]), arr(4, [num(0), num(0)])];
    const locals: [string, SValue][] = [["a", ref(1)], ["b", ref(2)], ["c", ref(3)], ["d", ref(4)], ["i", num(1)]];
    const pointers = buildPointerModel(trace(steps(objects, locals)), "a[i]; b[i]; c[i]; d[i];").at(0);
    expect(pointers.all.map((pointer) => pointer.target.host)).toEqual([objectHost(1), objectHost(2), objectHost(3)]);
  });

  it("resolves this.field bases and falls back to outer frames", () => {
    const instance = obj(9, [["nums", ref(1)]], "Solution");
    const objects = table(NUMS, instance);
    const outer = frame(1, [["nums", ref(1)], ["limit", num(2)]], ref(9), "solve");
    const inner = frame(2, [["i", num(2)], ["x", num(1)]], ref(9), "helper");
    const pointers = buildPointerModel(trace([step(0, [outer, inner], objects)]), "this.nums[x]; nums[i];").at(0);
    expect(names(pointers.at(objectHost(1), "2"))).toEqual(["i"]);
    expect(names(pointers.at(objectHost(1), "1"))).toEqual(["x"]);
  });

  it("falls back to the frame's first array or string for conventional names", () => {
    const model = buildPointerModel(trace(steps([NUMS], [["flag", { k: "boolean", v: true }], ["nums", ref(1)], ["j", num(1)], ["count", num(1)]])), "");
    const pointers = model.at(0);
    expect(names(pointers.at(objectHost(1), "1"))).toEqual(["j"]);
    expect(pointers.all).toHaveLength(1);
  });

  it("does not guess when there is no array to point into", () => {
    const pointers = buildPointerModel(trace(steps([], [["i", num(1)]])), "").at(0);
    expect(pointers.all).toEqual([]);
  });

  it("uses the last declaration of a shadowed name", () => {
    const pointers = buildPointerModel(trace(steps([NUMS], [["nums", ref(1)], ["i", num(0)], ["i", num(2)]])), "nums[i]").at(0);
    expect(pointers.all).toHaveLength(1);
    expect(pointers.all[0].value).toEqual(num(2));
  });
});

describe("windows", () => {
  const code = "while (left < right) { nums[left]; nums[right]; nums[mid]; }";
  const locals = (left: number, right: number): [string, SValue][] => [["nums", ref(1)], ["left", num(left)], ["right", num(right)], ["mid", num(1)]];

  it("pairs left/right on the same host into a range", () => {
    const [range, ...rest] = buildPointerModel(trace(steps([NUMS], locals(0, 2))), code).at(0).ranges(objectHost(1));
    expect(rest).toEqual([]);
    expect(range).toMatchObject({ host: objectHost(1), from: 0, to: 2 });
    expect(range.start.name).toBe("left");
    expect(range.end.name).toBe("right");
  });

  it("keeps from <= to when the pointers have crossed", () => {
    const [range] = buildPointerModel(trace(steps([NUMS], locals(2, 0))), code).at(0).ranges(objectHost(1));
    expect(range).toMatchObject({ from: 0, to: 2 });
    expect(range.start.name).toBe("left");
  });

  it("makes no range when one end is out of range or only one name exists", () => {
    const model = buildPointerModel(trace(steps([NUMS], locals(0, 3), [["nums", ref(1)], ["left", num(1)]])), code);
    expect(model.at(0).ranges(objectHost(1))).toEqual([]);
    expect(model.at(1).ranges(objectHost(1))).toEqual([]);
  });

  it("pairs names of different spellings", () => {
    const pairs: [string, string][] = [["l", "r"], ["lo", "hi"], ["low", "high"], ["start", "end"], ["begin", "end"], ["head", "tail"], ["front", "back"]];
    for (const [a, b] of pairs) {
      const model = buildPointerModel(trace(steps([NUMS], [["nums", ref(1)], [a, num(0)], [b, num(2)]])), `nums[${a}]; nums[${b}];`);
      expect(model.at(0).ranges(objectHost(1))).toHaveLength(1);
    }
  });

  it("does not pair pointers of different frames", () => {
    const f1 = frame(1, [["nums", ref(1)], ["left", num(0)]], { k: "undefined" }, "outer");
    const f2 = frame(2, [["right", num(2)]], { k: "undefined" }, "inner");
    const model = buildPointerModel(trace([step(0, [f1, f2], table(NUMS))]), "nums[left]; nums[right];");
    expect(model.at(0).ranges(objectHost(1))).toEqual([]);
  });
});

describe("reference pointers", () => {
  const list = [obj(1, [["val", num(1)], ["next", ref(2)]]), obj(2, [["val", num(2)], ["next", nul]])];

  it("tags node objects with the variables that point at them", () => {
    const pointers = buildPointerModel(trace(steps(list, [["head", ref(1)], ["curr", ref(1)], ["prev", ref(2)]])), "").at(0);
    expect(names(pointers.at(objectHost(1), null))).toEqual(["head", "curr"]);
    expect(names(pointers.at(objectHost(2), null))).toEqual(["prev"]);
    expect(pointers.all.every((pointer) => pointer.kind === "ref")).toBe(true);
    expect(pointers.at(objectHost(1), "val")).toEqual([]);
  });

  it("tags only arrays, maps, sets and heaps that another object holds", () => {
    const grid = arr(1, [ref(2)]);
    const objects = [grid, arr(2, [num(1)]), arr(3, [num(9)]), map(4, []), set(5, []), heap(6, [])];
    const locals: [string, SValue][] = [["grid", ref(1)], ["row", ref(2)], ["nums", ref(3)], ["m", ref(4)], ["s", ref(5)], ["h", ref(6)]];
    const pointers = buildPointerModel(trace(steps(objects, locals)), "").at(0);
    expect(names(pointers.all)).toEqual(["row"]);
    expect(pointers.at(objectHost(2), null)[0].target).toEqual({ host: objectHost(2), cellKey: null });
  });

  it("skips function values and missing objects", () => {
    const locals: [string, SValue][] = [["cb", { k: "function", name: "cb" }], ["ghost", ref(99)], ["this", ref(1)]];
    expect(buildPointerModel(trace(steps(list, locals)), "").at(0).all).toEqual([]);
  });

  it("reports names that were references and are null now", () => {
    const model = buildPointerModel(
      trace(steps(list, [["curr", ref(1)], ["x", nul]], [["curr", ref(2)], ["x", nul]], [["curr", nul], ["x", nul]])),
      "",
    );
    expect(model.at(0).nulls).toEqual([]);
    expect(model.at(2).nulls).toHaveLength(1);
    expect(model.at(2).nulls[0]).toMatchObject({ name: "curr", kind: "ref", isActive: true, target: { host: NULL_HOST, cellKey: null }, value: nul });
    expect(model.at(2).all).toEqual([]);
    expect(model.slotOf("x")).toBeUndefined();
  });

  it("shows a name as null before it first holds a node", () => {
    const model = buildPointerModel(trace(steps(list, [["prev", nul]], [["prev", ref(1)]])), "");
    expect(names(model.at(0).nulls)).toEqual(["prev"]);
    expect(model.at(0).nulls[0].slot).toBe(model.slotOf("prev"));
  });
});

describe("slots and frames", () => {
  it("assigns slots by first appearance over the whole trace", () => {
    const model = buildPointerModel(
      trace(steps([NUMS], [["nums", ref(1)], ["j", num(0)]], [["nums", ref(1)], ["i", num(1)], ["j", num(1)]], [["nums", ref(1)], ["i", num(2)]])),
      "nums[i]; nums[j];",
    );
    expect(model.slotOf("j")).toBe(0);
    expect(model.slotOf("i")).toBe(1);
    expect(model.slotCount).toBe(2);
    expect(model.slotOf("nope")).toBeUndefined();
    const slotsAt = (index: number) => model.at(index).all.map((pointer) => [pointer.name, pointer.slot]);
    expect(slotsAt(0)).toEqual([["j", 0]]);
    expect(slotsAt(1)).toEqual([["j", 0], ["i", 1]]);
    expect(slotsAt(2)).toEqual([["i", 1]]);
  });

  it("drops a pointer when its variable leaves scope but keeps its slot", () => {
    const model = buildPointerModel(trace(steps([NUMS], [["nums", ref(1)], ["i", num(1)]], [["nums", ref(1)]])), "nums[i]");
    expect(model.at(1).all).toEqual([]);
    expect(model.at(1).at(objectHost(1), "1")).toEqual([]);
    expect(model.slotOf("i")).toBe(0);
  });

  it("dims caller-frame pointers and lists the active frame first within a slot", () => {
    const caller = frame(1, [["nums", ref(1)], ["i", num(0)]], { k: "undefined" }, "outer");
    const callee = frame(2, [["nums", ref(1)], ["i", num(2)]], { k: "undefined" }, "outer");
    const pointers = buildPointerModel(trace([step(0, [caller, callee], table(NUMS))]), "nums[i]").at(0);
    expect(pointers.all.map((pointer) => [pointer.frameId, pointer.isActive])).toEqual([[2, true], [1, false]]);
    expect(pointers.all[0].slot).toBe(pointers.all[1].slot);
    expect(pointers.at(objectHost(1), "0")[0].isActive).toBe(false);
  });

  it("returns an empty result for steps that do not exist and memoises real ones", () => {
    const model = buildPointerModel(trace(steps([NUMS], [["nums", ref(1)], ["i", num(0)]])), "nums[i]");
    expect(model.at(5).all).toEqual([]);
    expect(model.at(-1).all).toEqual([]);
    expect(model.at(0)).toBe(model.at(0));
  });

  it("builds a 2000-step trace quickly", () => {
    const rows = Array.from({ length: 20 }, (_, index) => arr(10 + index, Array.from({ length: 20 }, (__, cell) => num(cell))));
    const objects: SObject[] = [arr(1, rows.map((row) => ref(row.id))), ...rows];
    const frames = (index: number): TraceFrame[] => [
      frame(1, [["grid", ref(1)], ["r", num(index % 20)], ["c", num((index * 7) % 25)], ["left", num(0)], ["right", num(5)], ["n", num(20)]], { k: "undefined" }, "outer"),
      frame(2, [["row", ref(10 + (index % 20))], ["i", num(index % 20)]], { k: "undefined" }, "inner"),
    ];
    const big = trace(Array.from({ length: 2000 }, (_, index) => step(index, frames(index), table(...objects))));
    const code = "grid[r][c]; grid[r]; grid[left]; grid[right]; row[i];";
    buildPointerModel(big, code);   // warm-up: the first run pays for JIT compilation
    // CPU time, best of several runs: wall-clock time balloons when parallel test workers compete for the cores.
    const timings = Array.from({ length: 3 }, () =>
      cpuMs(() => {
        const model = buildPointerModel(big, code);
        for (let index = 0; index < 2000; index += 50) model.at(index);
      }),
    );
    expect(Math.min(...timings)).toBeLessThan(200);
    expect(buildPointerModel(big, code).slotCount).toBeGreaterThan(3);
  });
});

describe("captured variables (nested functions)", () => {
  const none: SValue = { k: "undefined" };
  const NODE_LIST = [obj(1, [["val", num(1)], ["next", ref(2)]]), obj(2, [["val", num(2)], ["next", nul]])];

  it("draws a variable borrowed by nested helper frames once, on its owner, and keeps it undimmed", () => {
    const shared: [string, SValue][] = [["nums", ref(1)], ["k", num(2)]];
    const owner = frame(1, [...shared, ["num", num(7)]], none, "findKthLargest");
    const siftUp = frame(2, [...shared, ["i", num(1)]], none, "siftUp");
    const swap = frame(3, [...shared, ["a", num(0)], ["b", num(1)]], none, "swap");
    const pointers = buildPointerModel(trace([step(0, [owner, siftUp, swap], table(NUMS))]), "nums[k]; nums[i]; nums[a]; nums[b];").at(0);
    expect(pointers.all.filter((pointer) => pointer.name === "k")).toHaveLength(1);
    expect(pointers.at(objectHost(1), "2")).toHaveLength(1);
    expect(pointers.at(objectHost(1), "2")[0]).toMatchObject({ frameId: 1, isActive: true });
    expect(names(pointers.all).sort()).toEqual(["a", "b", "i", "k"]);
  });

  it("does not repeat borrowed reference variables either", () => {
    const shared: [string, SValue][] = [["head", ref(1)], ["cur", ref(2)]];
    const outer = frame(1, shared, none, "reverse");
    const inner = frame(2, [...shared, ["step", num(1)]], none, "walk");
    const pointers = buildPointerModel(trace([step(0, [outer, inner], table(...NODE_LIST))]), "").at(0);
    expect(names(pointers.at(objectHost(1), null))).toEqual(["head"]);
    expect(names(pointers.at(objectHost(2), null))).toEqual(["cur"]);
  });

  it("keeps separate pointers for the frames of one recursive function", () => {
    const dfs = (id: number, node: SValue) => frame(id, [["node", node]], none, "dfs");
    const pointers = buildPointerModel(trace([step(0, [dfs(1, ref(1)), dfs(2, ref(2))], table(...NODE_LIST))]), "").at(0);
    expect(pointers.all.map((pointer) => [pointer.frameId, pointer.target.host, pointer.isActive])).toEqual([
      [2, objectHost(2), true],
      [1, objectHost(1), false],
    ]);
  });

  it("keeps a recursive window paired in the active frame when only one bound moves", () => {
    const search = (id: number, hi: number) => frame(id, [["nums", ref(1)], ["lo", num(0)], ["hi", num(hi)]], none, "search");
    const model = buildPointerModel(trace([step(0, [search(1, 2), search(2, 1)], table(NUMS))]), "nums[lo]; nums[hi];");
    const ranges = model.at(0).ranges(objectHost(1));
    expect(ranges.map((range) => [range.start.frameId, range.from, range.to])).toEqual(expect.arrayContaining([[2, 0, 1], [1, 0, 2]]));
  });

  it("collapses equal pointers of recursion frames to the innermost one", () => {
    const f = (id: number) => frame(id, [["nums", ref(1)], ["i", num(1)]], none, "f");
    const pointers = buildPointerModel(trace([step(0, [f(1), f(2)], table(NUMS))]), "nums[i]").at(0);
    expect(pointers.all).toHaveLength(1);
    expect(pointers.all[0]).toMatchObject({ frameId: 2, isActive: true });
    expect(pointers.at(objectHost(1), "1")).toHaveLength(1);
  });

  it("does not mistake a different function's equal first parameter for a capture unless the prefix matches", () => {
    const outer = frame(1, [["x", num(1)], ["nums", ref(1)]], none, "solve");
    const helper = frame(2, [["nums", ref(1)], ["i", num(1)]], none, "helper");
    const pointers = buildPointerModel(trace([step(0, [outer, helper], table(NUMS))]), "nums[i]").at(0);
    expect(names(pointers.all)).toEqual(["i"]);
    expect(pointers.all[0]).toMatchObject({ frameId: 2, isActive: true });
  });
});

describe("name-only fallback", () => {
  it("never guesses for count-like or accumulator-like names", () => {
    const locals: [string, SValue][] = [["nums", ref(1)], ["k", num(2)], ["r", num(20)], ["p", num(1)], ["top", num(0)]];
    expect(buildPointerModel(trace(steps([NUMS], locals)), "").at(0).all).toEqual([]);
  });

  it("points them once the source indexes with them", () => {
    const locals: [string, SValue][] = [["nums", ref(1)], ["k", num(2)], ["r", num(5)]];
    const pointers = buildPointerModel(trace(steps([NUMS], locals)), "nums[k]; nums[r];").at(0);
    expect(names(pointers.at(objectHost(1), "2"))).toEqual(["k"]);
    expect(names(pointers.outOfRange(objectHost(1)))).toEqual(["r"]);
  });

  it("drops a name-only guess that lands outside the array", () => {
    expect(buildPointerModel(trace(steps([NUMS], [["nums", ref(1)], ["i", num(5)]])), "").at(0).all).toEqual([]);
    expect(buildPointerModel(trace(steps([NUMS], [["nums", ref(1)], ["i", num(-1)]])), "").at(0).all).toEqual([]);
    expect(names(buildPointerModel(trace(steps([NUMS], [["nums", ref(1)], ["i", num(2)]])), "").at(0).all)).toEqual(["i"]);
  });
});

describe("localNamesByObject", () => {
  it("names objects by locals, innermost frame first, then this fields", () => {
    const instance = obj(9, [["nums", ref(1)], ["extra", ref(2)], ["count", num(0)]], "Solution");
    const objects = table(NUMS, arr(2, []), arr(3, []), instance);
    const outer = frame(1, [["data", ref(1)], ["other", ref(3)]], ref(9), "outer");
    const inner = frame(2, [["list", ref(1)]], ref(9), "inner");
    const named = localNamesByObject(step(0, [outer, inner], objects));
    expect(named.get(1)).toBe("list");
    expect(named.get(3)).toBe("other");
    expect(named.get(2)).toBe("this.extra");
    expect(named.has(9)).toBe(false);
  });

  it("names this fields that no local holds", () => {
    const instance = obj(9, [["adj", ref(1)]], "Graph");
    const named = localNamesByObject(step(0, [frame(1, [], ref(9), "m")], table(NUMS, instance)));
    expect(named.get(1)).toBe("this.adj");
  });
});
