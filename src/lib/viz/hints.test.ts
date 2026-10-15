import { describe, expect, it } from "vitest";
import { parseHintKey, resolveHintTargets } from "./hints";
import type { SValue } from "@/lib/tracer/types";
import { arr, frame, heap, map, nul, num, obj, ref, set, step, str, table } from "./test-helpers";
import type { ObjectTable } from "./types";

describe("parseHintKey", () => {
  it("splits this-paths and local paths", () => {
    expect(parseHintKey("this.tweetMap")).toEqual({ isThis: true, root: "", path: ["tweetMap"] });
    expect(parseHintKey("minHeap")).toEqual({ isThis: false, root: "minHeap", path: [] });
    expect(parseHintKey("a.b.c")).toEqual({ isThis: false, root: "a", path: ["b", "c"] });
  });

  it("rejects empty segments", () => {
    expect(parseHintKey("a..b")).toBeNull();
    expect(parseHintKey("")).toBeNull();
  });
});

describe("resolveHintTargets", () => {
  const objects = table(
    obj(1, [["tweetMap", ref(2)], ["users", ref(3)]], "Twitter"),
    obj(2, []),
    map(3, [[str("a"), ref(5)], [num(7), ref(6)]]),
    heap(4, []),
    arr(5, []),
    arr(6, []),
  );
  const frames = [frame(1, [], ref(1), "getNewsFeed"), frame(2, [["minHeap", ref(4)]], { k: "undefined" }, "inner")];
  const current = step(0, frames, objects);

  it("resolves this.* through any frame's self", () => {
    const targets = resolveHintTargets(current, { "this.tweetMap": "map", "this.users": "map" });
    expect(targets.get(2)).toBe("map");
    expect(targets.get(3)).toBe("map");
  });

  it("resolves locals from the innermost frame outward", () => {
    expect(resolveHintTargets(current, { minHeap: "heap" }).get(4)).toBe("heap");
  });

  it("follows map keys and array indices", () => {
    const targets = resolveHintTargets(current, { "this.users.a": "array", "this.users.7": "grid" });
    expect(targets.get(5)).toBe("array");
    expect(targets.get(6)).toBe("grid");
  });

  it("ignores unmatched, primitive and invalid hints", () => {
    const targets = resolveHintTargets(current, { missing: "heap", "this.nope": "map", "this..x": "map", "this.tweetMap.deep.er": "map" });
    expect(targets.size).toBe(0);
  });

  it("lets the first key win when two keys name the same object", () => {
    const targets = resolveHintTargets(current, { minHeap: "heap", "a.b": "tree" });
    expect(targets.get(4)).toBe("heap");
  });
});

describe("resolveHintTargets name inference", () => {
  const stepWith = (locals: [string, SValue][], objects: ObjectTable, self?: SValue) => step(0, [frame(1, locals, self)], objects);
  const numbers = (id: number, values: number[]) => arr(id, values.map((value) => num(value)));

  it("infers heap from priority-queue names for arrays", () => {
    for (const name of ["heap", "minHeap", "maxHeap", "pq", "priorityQueue", "heapq"]) {
      expect(resolveHintTargets(stepWith([[name, ref(1)]], table(numbers(1, [5, 1, 3]))), {}).get(1)).toBe("heap");
    }
    expect(resolveHintTargets(stepWith([["pq", ref(1)]], table(set(1, [num(1)]))), {}).size).toBe(0);
  });

  it("infers bars from numeric arrays named like heights", () => {
    for (const name of ["height", "heights", "bar", "bars", "histogram", "hist", "walls", "elevation", "skyline"]) {
      expect(resolveHintTargets(stepWith([[name, ref(1)]], table(numbers(1, [2, 1, 4]))), {}).get(1)).toBe("bars");
    }
    expect(resolveHintTargets(stepWith([["heights", ref(1)]], table(arr(1, [num(1), str("a")]))), {}).size).toBe(0);
    expect(resolveHintTargets(stepWith([["heights", ref(1)]], table(arr(1, []))), {}).size).toBe(0);
  });

  it("infers tree from level-order arrays that hold a null or have 3+ items", () => {
    for (const name of ["tree", "bst", "segTree", "segmentTree"]) {
      expect(resolveHintTargets(stepWith([[name, ref(1)]], table(numbers(1, [4, 2, 6]))), {}).get(1)).toBe("tree");
    }
    expect(resolveHintTargets(stepWith([["tree", ref(1)]], table(arr(1, [num(1), nul]))), {}).get(1)).toBe("tree");
    expect(resolveHintTargets(stepWith([["tree", ref(1)]], table(numbers(1, [1, 2]))), {}).size).toBe(0);
  });

  it("infers graph only when the shape is graph-like", () => {
    const adjacency = table(arr(1, [ref(2), ref(3)]), arr(2, [num(1)]), arr(3, [num(0)]));
    for (const name of ["graph", "adj", "adjList", "adjacency", "adjMatrix", "neighbors", "edges", "network", "routes", "flights", "roads"]) {
      expect(resolveHintTargets(stepWith([[name, ref(1)]], adjacency), {}).get(1)).toBe("graph");
    }
    expect(resolveHintTargets(stepWith([["graph", ref(1)]], table(numbers(1, [1, 2, 3]))), {}).size).toBe(0);
  });

  it("matches names case-insensitively, through this.<field>, and ignores other names", () => {
    const objects = table(obj(9, [["heights", ref(1)]], "Solver"), numbers(1, [3, 1, 2]), numbers(2, [3, 1, 2]));
    const targets = resolveHintTargets(stepWith([["nums", ref(2)]], objects, ref(9)), {});
    expect(targets.get(1)).toBe("bars");
    expect(targets.has(2)).toBe(false);
    expect(resolveHintTargets(stepWith([["HEIGHTS", ref(2)]], objects), {}).get(2)).toBe("bars");
  });

  it("lets explicit hints win over the name", () => {
    const objects = table(numbers(1, [3, 1, 2]));
    expect(resolveHintTargets(stepWith([["heights", ref(1)]], objects), { heights: "array" }).get(1)).toBe("array");
    expect(resolveHintTargets(stepWith([["heights", ref(1)]], objects), { heights: "heap" }).get(1)).toBe("heap");
  });
});
