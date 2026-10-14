import { describe, expect, it } from "vitest";
import { PriorityQueue } from "./priority-queue";
import { beginSnapshot, createSerializeContext } from "./serializer";
import type { SRef } from "./types";

function snapshotOf(ctx: ReturnType<typeof createSerializeContext>, ...roots: unknown[]) {
  const writer = beginSnapshot(ctx);
  const values = roots.map((root) => writer.serialize(root));
  return { values, objects: writer.objects };
}

describe("serializer primitives", () => {
  it("inlines primitives and keeps special numbers", () => {
    const ctx = createSerializeContext();
    const { values, objects } = snapshotOf(ctx, 1, "a", true, null, undefined, NaN, Infinity, -0, BigInt(10), Symbol("s"));
    expect(values[0]).toEqual({ k: "number", v: 1 });
    expect(values[3]).toEqual({ k: "null" });
    expect(values[4]).toEqual({ k: "undefined" });
    expect(Number.isNaN((values[5] as { v: number }).v)).toBe(true);
    expect((values[6] as { v: number }).v).toBe(Infinity);
    expect(Object.is((values[7] as { v: number }).v, -0)).toBe(true);
    expect(values[8]).toEqual({ k: "bigint", v: "10" });
    expect(values[9]).toEqual({ k: "symbol", v: "Symbol(s)" });
    expect(objects).toEqual({});
  });

  it("represents functions, dates and regexps without refs", () => {
    const ctx = createSerializeContext();
    function helper() {}
    const { values, objects } = snapshotOf(ctx, helper, new Date(0), /ab+/g);
    expect(values[0]).toEqual({ k: "function", name: "helper" });
    expect(values[1]).toEqual({ k: "opaque", label: "1970-01-01T00:00:00.000Z" });
    expect(values[2]).toEqual({ k: "opaque", label: "/ab+/g" });
    expect(objects).toEqual({});
  });

  it("cuts long strings", () => {
    const ctx = createSerializeContext({ maxStringLength: 5 });
    const { values } = snapshotOf(ctx, "abcdefgh");
    expect(values[0]).toEqual({ k: "string", v: "abcde…" });
  });
});

describe("serializer containers", () => {
  it("keeps object identity stable across snapshots after mutation", () => {
    const ctx = createSerializeContext();
    const list = [1, 2];
    const first = snapshotOf(ctx, list);
    list.push(3);
    const second = snapshotOf(ctx, list);
    const firstRef = first.values[0] as SRef;
    const secondRef = second.values[0] as SRef;
    expect(secondRef.id).toBe(firstRef.id);
    expect(first.objects[firstRef.id]).toMatchObject({ k: "array", length: 2 });
    expect(second.objects[secondRef.id]).toMatchObject({ k: "array", length: 3 });
  });

  it("assigns ids from 1 and a shared reference appears once", () => {
    const ctx = createSerializeContext();
    const shared = { n: 1 };
    const { values, objects } = snapshotOf(ctx, { a: shared, b: shared });
    expect((values[0] as SRef).id).toBe(1);
    expect(Object.keys(objects)).toHaveLength(2);
    const root = objects[1];
    if (root.k !== "object") throw new Error("expected object");
    expect(root.entries[0][1]).toEqual(root.entries[1][1]);
  });

  it("handles cycles", () => {
    const ctx = createSerializeContext();
    const node: { self?: unknown } = {};
    node.self = node;
    const { values, objects } = snapshotOf(ctx, node);
    const ref = values[0] as SRef;
    const entry = objects[ref.id];
    if (entry.k !== "object") throw new Error("expected object");
    expect(entry.entries[0][1]).toEqual(ref);
  });

  it("serializes class instances with their class name", () => {
    class Twitter {
      users = new Map([[1, new Set([2])]]);
    }
    const ctx = createSerializeContext();
    const { objects } = snapshotOf(ctx, new Twitter());
    const kinds = Object.values(objects).map((entry) => entry.k).sort();
    expect(kinds).toEqual(["map", "object", "set"]);
    expect(objects[1]).toMatchObject({ k: "object", className: "Twitter", size: 1 });
  });

  it("serializes Set, Map and PriorityQueue kinds", () => {
    const ctx = createSerializeContext();
    const queue = new PriorityQueue<number>().enqueue(3).enqueue(1).enqueue(2);
    const { values, objects } = snapshotOf(ctx, new Set([1, 2]), new Map([["k", 1]]), queue);
    expect(objects[(values[0] as SRef).id]).toMatchObject({ k: "set", size: 2 });
    expect(objects[(values[1] as SRef).id]).toMatchObject({ k: "map", size: 1 });
    const heap = objects[(values[2] as SRef).id];
    expect(heap).toMatchObject({ k: "heap", size: 3 });
    if (heap.k !== "heap") throw new Error("expected heap");
    expect(heap.items.map((item) => (item as { v: number }).v)).toEqual([...queue.heapItems()]);
  });

  it("serializes typed arrays as arrays and holes as undefined", () => {
    const ctx = createSerializeContext();
    const { values, objects } = snapshotOf(ctx, new Int8Array([1, 2]), [1, , 3]);
    expect(objects[(values[0] as SRef).id]).toMatchObject({ k: "array", length: 2 });
    const sparse = objects[(values[1] as SRef).id];
    if (sparse.k !== "array") throw new Error("expected array");
    expect(sparse.items[1]).toEqual({ k: "undefined" });
  });

  it("never invokes user getters", () => {
    const ctx = createSerializeContext();
    let isCalled = false;
    const value = {
      get trap() {
        isCalled = true;
        throw new Error("boom");
      },
      plain: 1,
    };
    const { objects } = snapshotOf(ctx, value);
    expect(isCalled).toBe(false);
    expect(objects[1]).toMatchObject({ k: "object", size: 2, entries: [["plain", { k: "number", v: 1 }]] });
  });
});

describe("serializer caps", () => {
  it("truncates containers but reports the true length", () => {
    const ctx = createSerializeContext({ maxItemsPerContainer: 3 });
    const { values, objects } = snapshotOf(ctx, [1, 2, 3, 4, 5], new Set([1, 2, 3, 4]), { a: 1, b: 2, c: 3, d: 4 });
    expect(objects[(values[0] as SRef).id]).toMatchObject({ length: 5 });
    expect(objects[(values[1] as SRef).id]).toMatchObject({ size: 4 });
    expect(objects[(values[2] as SRef).id]).toMatchObject({ size: 4 });
    const array = objects[(values[0] as SRef).id];
    if (array.k !== "array") throw new Error("expected array");
    expect(array.items).toHaveLength(3);
  });

  it("turns objects past maxObjects into opaque values", () => {
    const ctx = createSerializeContext({ maxObjects: 3 });
    const items = Array.from({ length: 6 }, (_, i) => ({ i }));
    const { objects } = snapshotOf(ctx, items);
    expect(Object.keys(objects)).toHaveLength(3);
    const root = objects[1];
    if (root.k !== "array") throw new Error("expected array");
    expect(root.items.filter((item) => item.k === "opaque").length).toBeGreaterThan(0);
  });

  it("serializes a 100k-node linked list without overflowing the stack", () => {
    const ctx = createSerializeContext();
    let head: { next: unknown; val: number } | null = null;
    for (let i = 0; i < 100_000; i++) head = { val: i, next: head };
    const { values, objects } = snapshotOf(ctx, head);
    expect(values[0]).toMatchObject({ k: "ref", id: 1 });
    expect(Object.keys(objects)).toHaveLength(300);
  });
});
