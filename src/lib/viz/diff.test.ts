import { describe, expect, it } from "vitest";
import { cellStatus, containerCells, diffLocals, diffObjects, localKey, objectStatus, valueKey } from "./diff";
import { arr, frame, map, nul, num, obj, ref, set, step, str, table } from "./test-helpers";

describe("valueKey", () => {
  it("separates types and identities", () => {
    expect(valueKey(num(1))).not.toBe(valueKey(str("1")));
    expect(valueKey(ref(1))).not.toBe(valueKey(ref(2)));
    expect(valueKey(nul)).toBe("null");
  });
});

describe("containerCells", () => {
  it("keys arrays by index and maps by key signature", () => {
    expect([...containerCells(arr(1, [num(5), num(6)])).keys()]).toEqual(["0", "1"]);
    expect([...containerCells(map(1, [[num(1), ref(2)]])).keys()]).toEqual(["number:1"]);
    expect([...containerCells(obj(1, [["a", num(1)]])).keys()]).toEqual(["a"]);
  });
});

describe("diffObjects", () => {
  it("reports nothing without a previous step or when nothing changed", () => {
    const objects = table(arr(1, [num(1)]));
    expect(diffObjects(undefined, objects).containers.size).toBe(0);
    expect(diffObjects(objects, objects).containers.size).toBe(0);
  });

  it("flags added, changed and removed cells of the same object", () => {
    const before = table(arr(1, [num(1), num(2), num(3)]));
    const after = table(arr(1, [num(1), num(9), num(3), num(4)]));
    const diff = diffObjects(before, after);
    expect(cellStatus(diff, 1, "1")).toBe("changed");
    expect(cellStatus(diff, 1, "3")).toBe("added");
    expect(cellStatus(diff, 1, "0")).toBeNull();
    const shrunk = diffObjects(after, before).containers.get(1);
    expect([...(shrunk?.removed ?? [])]).toEqual(["3"]);
  });

  it("treats objects missing from the previous step as new, without per-cell flags", () => {
    const diff = diffObjects(table(arr(1, [])), table(arr(1, [ref(2)]), arr(2, [num(1)])));
    expect(diff.newIds.has(2)).toBe(true);
    expect(cellStatus(diff, 2, "0")).toBeNull();
    expect(cellStatus(diff, 1, "0")).toBe("added");
  });

  it("tracks set membership and object entries", () => {
    const diff = diffObjects(table(set(1, [num(1)]), obj(2, [["n", num(0)]])), table(set(1, [num(1), num(2)]), obj(2, [["n", num(1)]])));
    expect(cellStatus(diff, 1, valueKey(num(2)))).toBe("added");
    expect(cellStatus(diff, 2, "n")).toBe("changed");
  });
});

describe("diffLocals", () => {
  it("flags changed and added variables of frames that already existed", () => {
    const before = step(0, [frame(1, [["a", num(1)], ["b", num(2)]])], table());
    const after = step(1, [frame(1, [["a", num(1)], ["b", num(3)], ["c", num(0)]]), frame(2, [["x", num(1)]])], table());
    const flags = diffLocals(before, after);
    expect(flags.get(localKey(1, "b"))).toBe("changed");
    expect(flags.get(localKey(1, "c"))).toBe("added");
    expect(flags.has(localKey(1, "a"))).toBe(false);
    expect(flags.has(localKey(2, "x"))).toBe(false);
  });

  it("is empty for the first step", () => {
    expect(diffLocals(undefined, step(0, [frame(1, [["a", num(1)]])], table())).size).toBe(0);
  });
});

describe("objectStatus", () => {
  it("is added for new objects, changed for edited ones, null otherwise", () => {
    const diff = diffObjects(table(obj(1, [["next", nul]]), obj(3, [])), table(obj(1, [["next", ref(2)]]), obj(2, []), obj(3, [])));
    expect(objectStatus(diff, 2)).toBe("added");
    expect(objectStatus(diff, 1)).toBe("changed");
    expect(objectStatus(diff, 3)).toBeNull();
  });
});
