import { describe, expect, it } from "vitest";
import { executeRun } from "./execute";
import { captureBuiltins, restoreBuiltins } from "./instrument-guard";
import type { TestCase } from "./types";

const originalPush = Array.prototype.push;
const originalIsArray = Array.isArray;
const originalKeys = Object.keys;
const mainCase: TestCase = { method: "main", args: [], expected: 1 };

describe("builtins guard", () => {
  it("restores replaced and removed properties, deletes added ones and reports what it cannot restore", () => {
    const target: Record<string, unknown> = { keep: 1, change: 2, remove: 3 };
    const snapshot = captureBuiltins([{ target }]);
    target.change = "changed";
    delete target.remove;
    target.added = true;
    expect(restoreBuiltins(snapshot)).toEqual([]);
    expect(target).toEqual({ keep: 1, change: 2, remove: 3 });
    target.change = "again";
    Object.freeze(target);
    expect(restoreBuiltins(snapshot)).toEqual(["change"]);
  });

  it("restores only the listed keys of a curated target and removes listed keys added later", () => {
    const target: Record<string, unknown> = { listed: 1, other: 2 };
    const snapshot = captureBuiltins([{ target, keys: ["listed", "absent"] }]);
    target.listed = 0;
    target.other = 0;
    target.absent = 0;
    restoreBuiltins(snapshot);
    expect(target).toEqual({ listed: 1, other: 0 });
  });
});

describe("executeRun with solutions that tamper with builtins", () => {
  it("keeps the runtime working when a solution replaces Array/Object methods, then restores them", () => {
    const code = "Array.prototype.push = null;\nArray.isArray = () => false;\nObject.keys = null;\nfunction main() {\n  return 1;\n}";
    const report = executeRun({ code, testCases: [mainCase, mainCase], traceCaseIndex: 0 });
    expect(report.cases.map((result) => [result.isPassed, result.error])).toEqual([
      [true, null],
      [true, null],
    ]);
    expect(report.trace?.steps.at(-1)?.kind).toBe("op-end");
    expect(Array.prototype.push).toBe(originalPush);
    expect(Array.isArray).toBe(originalIsArray);
    expect(Object.keys).toBe(originalKeys);
  });

  it("turns harness breakage into per-case runtime errors instead of crashing the run", () => {
    const code = "Array.isArray = null;\nfunction main() {\n  return [1];\n}";
    const report = executeRun({ code, testCases: [{ ...mainCase, expected: [1] }, { ...mainCase, expected: [1] }], traceCaseIndex: 0 });
    expect(report.cases.map((result) => result.error?.kind)).toEqual(["runtime", "runtime"]);
    expect(report.trace?.steps.at(-1)).toMatchObject({ kind: "error", message: report.cases[0].error?.message });
    expect(Array.isArray).toBe(originalIsArray);
  });

  it("keeps a builtin a solution adds for later ops of the same case, then removes it", () => {
    const code = [
      "Array.prototype.last = function () { return this[this.length - 1]; };",
      "class Solution {",
      "  constructor() { this.items = []; }",
      "  add(x) { this.items.push(x); }",
      "  top() { return this.items.last(); }",
      "}",
    ].join("\n");
    const testCase = { ops: ["Solution", "add", "add", "top"], args: [[], [1], [2], []], expected: [null, null, null, 2] };
    expect(executeRun({ code, testCases: [testCase], traceCaseIndex: null }).cases[0].isPassed).toBe(true);
    expect("last" in Array.prototype).toBe(false);
  });

  it("reports a null test case as invalid without aborting the others", () => {
    const code = "function main() {\n  return 1;\n}";
    const report = executeRun({ code, testCases: [null as unknown as TestCase, mainCase], traceCaseIndex: null });
    expect(report.cases[0].error).toEqual({ kind: "setup", message: "Invalid test case: a test case must be an object", line: null, column: null });
    expect(report.cases[1].isPassed).toBe(true);
    const notArray = executeRun({ code, testCases: "nope" as unknown as TestCase[], traceCaseIndex: null });
    expect(notArray).toMatchObject({ compileError: { kind: "setup" }, cases: [], trace: null });
  });
});
