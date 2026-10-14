import { describe, expect, it } from "vitest";
import { formatJsonValue, formatPrimitive, nodeLabel, summarizeValue } from "./format";
import { arr, heap, map, nul, num, obj, ref, set, str, table } from "./test-helpers";

describe("formatPrimitive", () => {
  it("formats each primitive with a tone", () => {
    expect(formatPrimitive(num(-0))).toEqual({ text: "-0", tone: "number" });
    expect(formatPrimitive(str("hi"))).toEqual({ text: '"hi"', tone: "string" });
    expect(formatPrimitive({ k: "bigint", v: "12" })).toEqual({ text: "12n", tone: "number" });
    expect(formatPrimitive({ k: "function", name: "f" }).text).toBe("ƒ f");
    expect(formatPrimitive(nul).tone).toBe("muted");
  });

  it("truncates long strings", () => {
    expect(formatPrimitive(str("x".repeat(100)), 5).text).toBe('"xxxxx…"');
  });
});

describe("summarizeValue", () => {
  const objects = table(
    arr(1, [num(1), num(5), num(1), num(-1), num(9)], 7),
    set(2, [num(1), num(2)]),
    obj(3, [["a", ref(1)], ["b", num(2)]], "Twitter"),
    map(4, []),
    heap(5, [num(2)]),
    arr(6, [ref(1)]),
  );

  it("summarises containers in one line", () => {
    expect(summarizeValue(objects, ref(1))).toBe("[1, 5, 1, -1, …]");
    expect(summarizeValue(objects, ref(2))).toBe("Set(2) {1, 2}");
    expect(summarizeValue(objects, ref(3))).toBe("Twitter {a, b}");
    expect(summarizeValue(objects, ref(4))).toBe("Map(0)");
    expect(summarizeValue(objects, ref(5))).toBe("Heap(1) [2]");
    expect(summarizeValue(objects, ref(6))).toBe("[[…7]]");
    expect(summarizeValue(objects, ref(99))).toBe("ref #99");
  });
});

describe("nodeLabel", () => {
  it("joins array items and shortens long labels", () => {
    const objects = table(arr(1, [num(1), num(5), num(1), num(-1)]), arr(2, [num(100000), num(200000), num(3)]));
    expect(nodeLabel(objects, ref(1))).toBe("1,5,1,-1");
    expect(nodeLabel(objects, ref(2))).toBe("100000,200…");
    expect(nodeLabel(objects, num(4))).toBe("4");
    expect(nodeLabel(objects, null)).toBe("…");
  });
});

describe("formatJsonValue", () => {
  it("prints compact JSON and cuts long values", () => {
    expect(formatJsonValue([6, 5])).toBe("[6,5]");
    expect(formatJsonValue(null)).toBe("null");
    expect(formatJsonValue("x".repeat(80), 10)).toBe('"xxxxxxxxx…');
  });
});
