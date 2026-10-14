import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DEFAULT_RUN_LIMITS, WORKER_WATCHDOG_MS } from "./constants";
import { executeRun } from "./execute";
import { runWatchdogMs } from "./instrument-limits";
import { lockDownGlobals } from "./instrument-sandbox";
import type { DesignTestCase, JsonValue, RunReport, SObject, SValue, Trace, TraceStep } from "./types";

const SEED_PATH = fileURLToPath(new URL("../../../scripts/seed/design-twitter.solution.txt", import.meta.url));
const seedCode = readFileSync(SEED_PATH, "utf8");
const twitterCase: DesignTestCase = {
  ops: ["Twitter", "postTweet", "getNewsFeed", "follow", "postTweet", "getNewsFeed", "unfollow", "getNewsFeed"],
  args: [[], [1, 5], [1], [1, 2], [2, 6], [1], [1, 2], [1]],
  expected: [null, null, [5], null, null, [6, 5], null, [5]],
};

function traceOf(report: RunReport): Trace {
  if (!report.trace) throw new Error("expected a trace");
  return report.trace;
}

function resolve(step: TraceStep, value: SValue): SObject | undefined {
  return value.k === "ref" ? step.objects[value.id] : undefined;
}

function runSeed(limits?: { maxRecordedSteps: number }): RunReport {
  return executeRun({ code: seedCode, testCases: [twitterCase], traceCaseIndex: 0, limits });
}

describe("executeRun: seed Design Twitter", () => {
  it("produces the expected results", () => {
    const report = runSeed();
    expect(report.compileError).toBeNull();
    const [result] = report.cases;
    expect(result.ops.map((op) => op.actual)).toEqual([null, null, [5], null, null, [6, 5], null, [5]]);
    expect(result.isPassed).toBe(true);
    expect(result.error).toBeNull();
  });

  it("records op-start/op-end around every op with lines inside the source", () => {
    const report = runSeed();
    const { steps, isTruncated } = traceOf(report);
    const lineCount = seedCode.split("\n").length;
    expect(isTruncated).toBe(false);
    expect(steps.length).toBeGreaterThan(50);
    steps.forEach((step, index) => {
      expect(step.index).toBe(index);
      expect(step.line).toBeGreaterThanOrEqual(1);
      expect(step.line).toBeLessThanOrEqual(lineCount);
    });
    for (const op of report.cases[0].ops) {
      const first = steps[op.firstStep ?? -1];
      const last = steps[op.lastStep ?? -1];
      expect(first).toMatchObject({ kind: "op-start", opIndex: op.index });
      expect(last).toMatchObject({ kind: "op-end", opIndex: op.index });
    }
    expect(steps.filter((step) => step.kind === "op-start")).toHaveLength(twitterCase.ops.length);
  });

  it("serializes heaps, `this` as a stable Solution object, return values and TDZ-free locals", () => {
    const report = runSeed();
    const { steps } = traceOf(report);
    const heaps = steps.flatMap((step) =>
      step.frames.flatMap((frame) => frame.locals.filter((local) => local.name === "minHeap").map((local) => resolve(step, local.value))),
    );
    expect(heaps.length).toBeGreaterThan(0);
    heaps.forEach((heap) => expect(heap?.k).toBe("heap"));

    const selfIds = new Set<number>();
    for (const step of steps) {
      for (const frame of step.frames) {
        const self = resolve(step, frame.self);
        if (!self) continue;
        expect(self).toMatchObject({ k: "object", className: "Solution" });
        selfIds.add(self.id);
      }
    }
    expect(selfIds.size).toBe(1);

    const feedEnd = steps[report.cases[0].ops[5].lastStep ?? -1];
    const returned = feedEnd.returnValue && resolve(feedEnd, feedEnd.returnValue);
    expect(returned).toMatchObject({ k: "array", items: [{ k: "number", v: 6 }, { k: "number", v: 5 }] });

    const feedStart = steps.find((step) => step.kind === "step" && step.line === 26);
    expect(feedStart?.frames.at(-1)?.locals.map((local) => local.name)).toEqual(["userId"]);
  });

  it("caps recorded steps but keeps running", () => {
    const report = runSeed({ maxRecordedSteps: 20 });
    const trace = traceOf(report);
    expect(trace.steps).toHaveLength(20);
    expect(trace.isTruncated).toBe(true);
    expect(report.cases[0].isPassed).toBe(true);
    expect(report.cases[0].stepCount).toBeGreaterThan(20);
    expect(report.cases[0].ops.at(-1)?.firstStep).toBeNull();
  });

  it("fails a wrong answer without an error", () => {
    const wrong = { ...twitterCase, expected: [null, null, [5], null, null, [5, 6], null, [5]] };
    const report = executeRun({ code: seedCode, testCases: [wrong], traceCaseIndex: null });
    const [result] = report.cases;
    expect(result.isPassed).toBe(false);
    expect(result.error).toBeNull();
    expect(result.ops.map((op) => op.isPassed)).toEqual([true, true, true, true, true, false, true, true]);
    expect(report.trace).toBeNull();
  });
});

describe("executeRun: cases and classes", () => {
  it("runs method cases on top-level functions and on class Solution", () => {
    const twoSum = [
      "function twoSum(nums, target) {",
      "  const seen = new Map();",
      "  for (let i = 0; i < nums.length; i++) {",
      "    if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];",
      "    seen.set(nums[i], i);",
      "  }",
      "  return [];",
      "}",
    ].join("\n");
    const report = executeRun({ code: twoSum, testCases: [{ method: "twoSum", args: [[2, 7, 11, 15], 9], expected: [0, 1] }], traceCaseIndex: 0 });
    expect(report.cases[0]).toMatchObject({ isPassed: true, error: null, ops: [{ name: "twoSum", actual: [0, 1] }] });
    const { steps } = traceOf(report);
    const mapStep = steps.find((step) => step.frames.at(-1)?.locals.some((local) => local.name === "seen"));
    const seen = mapStep?.frames.at(-1)?.locals.find((local) => local.name === "seen");
    expect(mapStep && seen && resolve(mapStep, seen.value)?.k).toBe("map");

    const classCode = "class Solution {\n  maxValue(nums) {\n    return Math.max(...nums);\n  }\n}";
    const classReport = executeRun({ code: classCode, testCases: [{ method: "maxValue", args: [[1, 9, 3]], expected: 9 }], traceCaseIndex: null });
    expect(classReport.cases[0]).toMatchObject({ isPassed: true, ops: [{ actual: 9 }] });
  });

  it("uses the user's class even when it is not named Solution", () => {
    const code = "class Twitter {\n  constructor() { this.posts = []; }\n  post(id) { this.posts.push(id); }\n  feed() { return [...this.posts].reverse(); }\n}";
    const testCase = { ops: ["Twitter", "post", "post", "feed"], args: [[], [1], [2], []], expected: [null, null, null, [2, 1]] };
    const report = executeRun({ code, testCases: [testCase], traceCaseIndex: 0 });
    expect(report.cases[0].isPassed).toBe(true);
    const lastStep = traceOf(report).steps.at(-1);
    const self = lastStep && resolve(lastStep, lastStep.frames[0].self);
    expect(self).toMatchObject({ k: "object", className: "Twitter" });
  });

  it("gives every case a fresh program scope and keeps running after a failing case", () => {
    const code = "let calls = 0;\nfunction count() {\n  calls++;\n  return calls;\n}\nfunction spin() {\n  while (true) {}\n}";
    const report = executeRun({
      code,
      testCases: [
        { method: "count", args: [], expected: 1 },
        { method: "spin", args: [], expected: null },
        { method: "count", args: [], expected: 1 },
      ],
      traceCaseIndex: null,
    });
    expect(report.cases.map((result) => result.isPassed)).toEqual([true, false, true]);
  });

  it("lets user code declare names that shadow the injected globals", () => {
    const code = "class PriorityQueue {\n  constructor() { this.items = [1]; }\n}\nfunction size() {\n  return new PriorityQueue().items.length;\n}";
    const report = executeRun({ code, testCases: [{ method: "size", args: [], expected: 1 }], traceCaseIndex: null });
    expect(report.compileError).toBeNull();
    expect(report.cases[0].isPassed).toBe(true);
  });

  it("reports syntax errors as a compile error", () => {
    const report = executeRun({ code: "function broken() {\n  return (;\n}", testCases: [twitterCase], traceCaseIndex: 0 });
    expect(report).toEqual({ compileError: { kind: "syntax", message: "Unexpected token", line: 2, column: 11 }, cases: [], trace: null });
  });
});

describe("executeRun: limits and errors", () => {
  it("stops `while (true) {}` at the step limit before the time limit", () => {
    const report = executeRun({ code: "function spin() {\n  while (true) {}\n}", testCases: [{ method: "spin", args: [], expected: null }], traceCaseIndex: 0 });
    const [result] = report.cases;
    expect(result.error).toMatchObject({ kind: "step-limit", line: 2 });
    expect(result.stepCount).toBe(200_000);
    const trace = traceOf(report);
    expect(trace.isTruncated).toBe(true);
    expect(trace.steps).toHaveLength(DEFAULT_RUN_LIMITS.maxRecordedSteps);
    expect(trace.steps.at(-1)).toMatchObject({ kind: "error", line: 2, message: result.error?.message });
  });

  it("ends a truncated trace with the error step, replacing the last step at the cap", () => {
    const code = "function main() {\n  for (let i = 0; i < 50; i++) {}\n  throw new Error('late');\n}";
    const report = executeRun({ code, testCases: [{ method: "main", args: [], expected: null }], traceCaseIndex: 0, limits: { maxRecordedSteps: 10 } });
    const { steps, isTruncated } = traceOf(report);
    expect(isTruncated).toBe(true);
    expect(steps).toHaveLength(10);
    expect(steps.at(-1)).toMatchObject({ index: 9, kind: "error", line: 3, message: "Error: late" });
    expect(report.cases[0].ops[0]).toMatchObject({ firstStep: 0, lastStep: 9 });
  });

  it("only calls members the solution defines and rejects `constructor` as an op", () => {
    const methodCase = (method: string) => ({ method, args: [], expected: null });
    const plain = executeRun({ code: "function main() {\n  return 1;\n}", testCases: [methodCase("toString"), methodCase("constructor")], traceCaseIndex: null });
    expect(plain.cases[0].error).toMatchObject({ kind: "setup", message: 'Function "toString" is not defined' });
    expect(plain.cases[1].error?.message).toContain('"constructor" cannot be called as an operation');
    const own = executeRun({ code: "class Solution {\n  toString() {\n    return 'custom';\n  }\n}", testCases: [{ method: "toString", args: [], expected: "custom" }], traceCaseIndex: null });
    expect(own.cases[0].isPassed).toBe(true);
    const designCase = (op: string) => ({ ops: ["Twitter", op], args: [[], []], expected: [null, null] });
    const design = executeRun({ code: seedCode, testCases: [designCase("hasOwnProperty"), designCase("constructor")], traceCaseIndex: null });
    expect(design.cases[0].error).toMatchObject({ kind: "setup", message: 'Method "hasOwnProperty" is not defined on the class' });
    expect(design.cases[1].error?.message).toContain('"constructor" cannot be called as an operation');
  });

  it("stops infinite recursion at the depth limit, pointing at the call site", () => {
    const code = "function down(n) {\n  return down(n + 1);\n}";
    const report = executeRun({ code, testCases: [{ method: "down", args: [0], expected: null }], traceCaseIndex: null });
    expect(report.cases[0].error).toMatchObject({ kind: "depth-limit", line: 2 });
  });

  it("reports a thrown error as a runtime error with its line and an error step", () => {
    const code = "function boom(n) {\n  const half = n / 2;\n  throw new RangeError('bad input ' + half);\n}";
    const report = executeRun({ code, testCases: [{ method: "boom", args: [4], expected: null }], traceCaseIndex: 0 });
    expect(report.cases[0].error).toEqual({ kind: "runtime", message: "RangeError: bad input 2", line: 3, column: null });
    const last = traceOf(report).steps.at(-1);
    expect(last).toMatchObject({ kind: "error", line: 3, message: "RangeError: bad input 2" });
    expect(last?.frames.at(-1)?.locals).toContainEqual({ name: "half", value: { k: "number", v: 2 } });
  });

  it("times out deterministically when the deadline is zero", () => {
    const report = executeRun({
      code: "function spin() {\n  for (;;);\n}",
      testCases: [{ method: "spin", args: [], expected: null }],
      traceCaseIndex: null,
      limits: { caseTimeoutMs: 0, maxSteps: Number.MAX_SAFE_INTEGER },
    });
    expect(report.cases[0].error).toMatchObject({ kind: "timeout", line: 2 });
  });

  it("reports a missing method as a setup error", () => {
    const report = executeRun({ code: seedCode, testCases: [{ ...twitterCase, ops: ["Twitter", "retweet"], args: [[], []], expected: [null, null] }], traceCaseIndex: null });
    expect(report.cases[0].error).toMatchObject({ kind: "setup", line: null });
    expect(report.cases[0].ops.map((op) => op.isPassed)).toEqual([true, false]);
  });
});

function runMain(code: string, expected: JsonValue, traceCaseIndex: number | null = 0, maxSteps?: number): RunReport {
  const limits = maxSteps === undefined ? undefined : { maxSteps };
  return executeRun({ code, testCases: [{ method: "main", args: [], expected }], traceCaseIndex, limits });
}

describe("executeRun: expression arrows, sandbox and robustness", () => {
  it("frames named expression arrows, so recursion through them is traced and hits the step limit", () => {
    const fib = "const fib = (n) => (n < 2 ? n : fib(n - 1) + fib(n - 2));\nfunction main() {\n  return fib(N);\n}";
    expect(runMain(fib.replace("N", "45"), null, null).cases[0].error).toMatchObject({ kind: "step-limit", line: 1 });
    const small = runMain(fib.replace("N", "3"), 2);
    expect(small.cases[0].isPassed).toBe(true);
    expect(traceOf(small).steps.some((step) => step.kind === "call" && step.frames.at(-1)?.name === "fib")).toBe(true);
  });

  it("counts anonymous inline arrows toward the step limit", () => {
    const code = "function main() {\n  return [1, 2, 3].map((x) => x * 2);\n}";
    expect(runMain(code, [2, 4, 6], null).cases[0].isPassed).toBe(true);
    expect(runMain(code, [2, 4, 6], null, 4).cases[0].error).toMatchObject({ kind: "step-limit", line: 2 });
  });

  it("hides network, messaging and worker globals from solution code", () => {
    const probes = ["fetch", "XMLHttpRequest", "importScripts", "postMessage", "WebSocket", "self.postMessage", "globalThis.fetch"];
    const code = `function main() {\n  return [${probes.map((probe) => `typeof ${probe}`).join(", ")}, typeof globalThis.Math.max, typeof self.PriorityQueue];\n}`;
    const report = runMain(code, null, null);
    expect(report.cases[0].ops[0].actual).toEqual([...probes.map(() => "undefined"), "function", "function"]);
    const dynamicImport = runMain("function main() {\n  return import('data:text/javascript,1');\n}", null);
    expect(dynamicImport.compileError).toMatchObject({ kind: "syntax", line: 2 });
  });

  it("locks blocked capabilities on the real global and reports what it could not lock", () => {
    const fakeGlobal: Record<string, unknown> = { fetch: () => 1, postMessage: () => 2, Math };
    Object.defineProperty(fakeGlobal, "caches", { value: {}, configurable: false });
    expect(lockDownGlobals(fakeGlobal)).toEqual(["caches"]);
    expect(fakeGlobal.fetch).toBeUndefined();
    expect(fakeGlobal.postMessage).toBeUndefined();
    expect(fakeGlobal.Math).toBe(Math);
    expect(() => {
      fakeGlobal.fetch = () => 3;
    }).toThrow(TypeError);
  });

  it("records a value whose Proxy trap throws as opaque instead of failing the case", () => {
    const code = "function main() {\n  const trap = new Proxy({}, { ownKeys() { throw new Error('trap'); } });\n  const after = [1];\n  return after.length;\n}";
    const report = runMain(code, 1);
    expect(report.cases[0]).toMatchObject({ isPassed: true, error: null });
    const atReturn = traceOf(report).steps.find((step) => step.kind === "step" && step.line === 4);
    const locals = atReturn?.frames.at(-1)?.locals ?? [];
    expect(locals.find((local) => local.name === "trap")?.value).toEqual({ k: "opaque", label: "(unreadable)" });
    const after = locals.find((local) => local.name === "after");
    expect(atReturn && after && resolve(atReturn, after.value)).toMatchObject({ k: "array", length: 1 });
  });

  it("still stops a runaway Proxy trap at the step limit", () => {
    const code = "function main() {\n  const trap = new Proxy({}, { ownKeys() { while (true) {} } });\n  return 1;\n}";
    expect(runMain(code, 1).cases[0].error).toMatchObject({ kind: "step-limit" });
  });

  it("stops recording once the trace node budget is spent, but keeps running", () => {
    const code = [
      "function main() {",
      "  const grid = Array.from({ length: 60 }, (_, r) => Array.from({ length: 60 }, (_, c) => r + c));",
      "  let sum = 0;",
      "  for (let i = 0; i < 500; i++) sum += i;",
      "  return sum + grid.length;",
      "}",
    ].join("\n");
    const report = runMain(code, 124_810);
    const trace = traceOf(report);
    expect(report.cases[0].isPassed).toBe(true);
    expect(trace.isTruncated).toBe(true);
    expect(trace.steps.length).toBeLessThan(report.cases[0].stepCount / 10);
  });

  it("scales the worker watchdog with the number of cases", () => {
    const testCases = Array.from({ length: 50 }, () => ({ method: "f", args: [], expected: null }));
    expect(runWatchdogMs({ code: "", testCases, traceCaseIndex: null })).toBe(WORKER_WATCHDOG_MS + 50 * DEFAULT_RUN_LIMITS.caseTimeoutMs);
    expect(runWatchdogMs({ code: "", testCases, traceCaseIndex: null, limits: { caseTimeoutMs: 100 } })).toBe(WORKER_WATCHDOG_MS + 5000);
  });
});
