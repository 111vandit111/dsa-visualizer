import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { instrument, TracerSyntaxError } from "./instrument";
import type { ScopeReader, TracerHooks } from "./runtime";

const SEED_PATH = fileURLToPath(new URL("../../../scripts/seed/design-twitter.solution.txt", import.meta.url));

interface ScopeSnapshot {
  line: number;
  listed: string[];
  readable: Record<string, unknown>;
}

/** Reads a scope like the runtime does: bindings still in their TDZ throw ReferenceError and are left out. */
function readScope(line: number, read: ScopeReader): ScopeSnapshot {
  const readable: Record<string, unknown> = {};
  const listed: string[] = [];
  for (const [name, get] of read().l) {
    listed.push(name);
    try {
      readable[name] = get();
    } catch (error) {
      if (!(error instanceof ReferenceError)) throw error;
    }
  }
  return { line, listed, readable };
}

/** Runs instrumented code with logging hooks and evaluates `entry` at the end of the program. */
function runWithHooks(code: string, entry: string) {
  const program = instrument(code);
  const calls: string[] = [];
  const scopes: ScopeSnapshot[] = [];
  const hooks: TracerHooks = {
    step: (line, read) => {
      calls.push(`step:${line}`);
      scopes.push(readScope(line, read));
    },
    loop: (line, read) => {
      calls.push(`loop:${line}`);
      scopes.push(readScope(line, read));
    },
    enter: (name, line) => calls.push(`enter:${name}:${line}`),
    ret: (line, value) => {
      calls.push(`ret:${line}:${JSON.stringify(value)}`);
      return value;
    },
    fall: (line) => calls.push(`fall:${line}`),
    exit: () => calls.push("exit"),
    tick: (line) => calls.push(`tick:${line}`),
  };
  const run = new Function(program.hooksName, `"use strict";${program.code}\n;return ${entry};`) as (hooks: TracerHooks) => unknown;
  return { program, calls, scopes, result: run(hooks) };
}

function isSubsequence(original: string, instrumented: string): boolean {
  let cursor = 0;
  for (const char of instrumented) if (char === original[cursor]) cursor++;
  return cursor === original.length;
}

describe("instrument", () => {
  it("keeps every original line at its line number and only inserts code", () => {
    const source = readFileSync(SEED_PATH, "utf8");
    const { code } = instrument(source);
    const originalLines = source.split("\n");
    const instrumentedLines = code.split("\n");
    expect(instrumentedLines).toHaveLength(originalLines.length);
    originalLines.forEach((line, index) => expect(isSubsequence(line, instrumentedLines[index])).toBe(true));
  });

  it("reports top-level names, classes and methods with their lines", () => {
    const program = instrument(readFileSync(SEED_PATH, "utf8"));
    expect(program.topLevelNames).toEqual(["Solution"]);
    expect(program.classes).toEqual([{ name: "Solution", line: 1 }]);
    expect(program.functions).toContainEqual({ name: "constructor", line: 2, className: "Solution" });
    expect(program.functions).toContainEqual({ name: "getNewsFeed", line: 25, className: "Solution" });
  });

  it("hooks statements, loop iterations, calls and returns with original lines", () => {
    const code = [
      "function main() {",
      "  let total = 0;",
      "  for (let i = 0; i < 2; i++) total += i;",
      "  if (total > 0) total = 10;",
      "  else total = -1;",
      "  return total;",
      "}",
    ].join("\n");
    const { calls, result } = runWithHooks(code, "main()");
    expect(result).toBe(10);
    expect(calls).toEqual([
      "enter:main:1",
      "step:2",
      "step:3",
      "loop:3",
      "step:3",
      "loop:3",
      "step:3",
      "step:4",
      "step:4",
      "step:6",
      "ret:6:10",
      "exit",
    ]);
  });

  it("hooks every iteration of loops with empty bodies and records fall-through returns", () => {
    const code = "function main() {\n  let n = 0;\n  for (; n < 3; n++);\n  while (n < 5) n++;\n}";
    const { calls } = runWithHooks(code, "main()");
    expect(calls.filter((call) => call.startsWith("loop:"))).toEqual(["loop:3", "loop:3", "loop:3", "loop:4", "loop:4"]);
    expect(calls.slice(-2)).toEqual(["fall:5", "exit"]);
  });

  it("preserves semantics of labels, ASI, switch scopes, finally and destructuring", () => {
    const code = [
      "function main() {",
      "  const out = []",
      "  outer: for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { if (j === 1) continue outer; out.push(i) }",
      "  switch (out.length) { case 3: { let x = 'three'; out.push(x); } break; default: out.push('other') }",
      "  const [first, { second = 2 } = {}] = [out[0]]",
      "  try { return [out, first, second] } finally { out.push('finally') }",
      "}",
    ].join("\n");
    const { result } = runWithHooks(code, "main()");
    expect(result).toEqual([[0, 1, 2, "three", "finally"], 0, 2]);
  });

  it("lists bindings in TDZ but they cannot be read until initialised", () => {
    const code = "function main() {\n  const before = 1;\n  const after = before + 1;\n  return after;\n}";
    const { scopes } = runWithHooks(code, "main()");
    expect(scopes.map((scope) => scope.listed)).toEqual([
      ["before", "after"],
      ["before", "after"],
      ["before", "after"],
    ]);
    expect(scopes.map((scope) => scope.readable)).toEqual([{}, { before: 1 }, { before: 1, after: 2 }]);
  });

  it("scope readers see params, patterns, loop and catch bindings and top-level names, not functions or classes", () => {
    const code = [
      "const LIMIT = 3;",
      "class Helper {}",
      "function helper() {}",
      "const fn = () => 1;",
      "function main({ a, b: [c] }, ...rest) {",
      "  for (const [k, v] of [[1, 2]]) {",
      "    try { throw new Error('x'); }",
      "    catch (err) {",
      "      return k + v + LIMIT;",
      "    }",
      "  }",
      "}",
    ].join("\n");
    const { scopes, result } = runWithHooks(code, "main({ a: 1, b: [2] }, 3)");
    expect(result).toBe(6);
    const atReturn = scopes.find((scope) => scope.line === 9);
    expect(atReturn?.listed).toEqual(["LIMIT", "a", "c", "rest", "k", "v", "err"]);
    expect(atReturn?.readable).toMatchObject({ LIMIT: 3, a: 1, c: 2, rest: [3], k: 1, v: 2 });
  });

  it("frames named functions and arrows; inline expression arrows only tick; async/generators get no frame", () => {
    const code = [
      "const half = (x) => x / 2;",
      "const twice = (x) => { return x * 2; };",
      "function* gen() { yield 1; }",
      "async function later() { return 1; }",
      "function main() { later(); return [...gen(), ...[3, 2].sort((a, b) => a - b).map(twice), half(8)]; }",
    ].join("\n");
    const { calls, result } = runWithHooks(code, "main()");
    expect(result).toEqual([1, 4, 6, 4]);
    expect(calls.filter((call) => call.startsWith("enter:"))).toEqual(["enter:main:5", "enter:twice:2", "enter:twice:2", "enter:half:1"]);
    expect(calls).toContain("ret:1:4");
    expect(calls).toContain("tick:5");
    expect(calls).toContain("step:3");
    expect(calls).toContain("step:4");
  });

  it("throws a TracerSyntaxError with a 1-based line and column", () => {
    const parseError = (code: string) => {
      try {
        instrument(code);
      } catch (error) {
        return error;
      }
      return null;
    };
    const error = parseError("const ok = 1;\nlet broken = ;\n");
    expect(error).toBeInstanceOf(TracerSyntaxError);
    expect(error).toMatchObject({ kind: "syntax", line: 2, column: 14 });
    expect(parseError("function f() {\n  with (Math) {}\n}")).toMatchObject({ kind: "syntax", line: 2, message: "'with' in strict mode" });
    expect(parseError("function f() {\n  return import('x');\n}")).toMatchObject({ kind: "syntax", line: 2, column: 10 });
  });

  it("picks a hooks name that user code does not use", () => {
    const { program, result } = runWithHooks("const __t = 5;\nfunction main() { return __t; }", "main()");
    expect(program.hooksName).not.toBe("__t");
    expect(result).toBe(5);
  });
});
