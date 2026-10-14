import { describe, expect, it } from "vitest";
import { parseHintKey, resolveHintTargets } from "./hints";
import { arr, frame, heap, map, num, obj, ref, step, str, table } from "./test-helpers";

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
