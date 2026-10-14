import { deepEqual } from "./deep-equal";
import { instrument, TracerSyntaxError, type InstrumentResult } from "./instrument";
import { captureHarnessBuiltins, restoreBuiltins } from "./instrument-guard";
import { resolveLimits } from "./instrument-limits";
import { sandboxParameters } from "./instrument-sandbox";
import { toJsonValue } from "./json-value";
import { PriorityQueue } from "./priority-queue";
import { TraceLimitError, TraceRuntime, type TracerHooks } from "./runtime";
import {
  isDesignCase,
  type CaseResult,
  type JsonValue,
  type OpResult,
  type RunError,
  type RunLimits,
  type RunReport,
  type RunRequest,
  type TestCase,
  type Trace,
} from "./types";

/** LeetCode's linked-list node, injected into user code. */
class ListNode {
  val: unknown;
  next: unknown;

  constructor(val?: unknown, next?: unknown) {
    this.val = val === undefined ? 0 : val;
    this.next = next === undefined ? null : next;
  }
}

/** LeetCode's binary-tree node, injected into user code. */
class TreeNode {
  val: unknown;
  left: unknown;
  right: unknown;

  constructor(val?: unknown, left?: unknown, right?: unknown) {
    this.val = val === undefined ? 0 : val;
    this.left = left === undefined ? null : left;
    this.right = right === undefined ? null : right;
  }
}

/** Helpers injected as parameters (never globals); see instrument-sandbox.ts for the hidden capabilities. */
const SANDBOX_HELPERS: Readonly<Record<string, unknown>> = { PriorityQueue, ListNode, TreeNode };
/** Builtins as they were before any solution code ran: restored around every case. */
const PRISTINE_BUILTINS = captureHarnessBuiltins([PriorityQueue.prototype, ListNode.prototype, TreeNode.prototype]);
/** Captured at load: solution code may replace these builtins while a case runs. */
const cloneArgs = structuredClone;
const clock = performance.now.bind(performance);
const reflectApply = Reflect.apply;
const reflectConstruct = Reflect.construct;
const reflectGet = Reflect.get;
const { getPrototypeOf, hasOwn } = Object;
const objectPrototype = Object.prototype;
const SOLUTION_CLASS_NAME = "Solution";
const CONSTRUCTOR_NAME = "constructor";
const CONSTRUCTOR_OP_MESSAGE = '"constructor" cannot be called as an operation: ops[0] already constructs the class';
const NOT_AN_OBJECT_PROBLEM = "a test case must be an object";
const FIRST_LINE = 1;
const STACK_OVERFLOW_ERRORS: ReadonlySet<string> = new Set(["RangeError", "InternalError"]);
const STACK_OVERFLOW_MESSAGE = /call stack|too much recursion/i;

/** Problem in the harness setup (missing class/method, malformed case): RunError kind "setup". */
class SetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SetupError";
  }
}

type Exports = Record<string, unknown>;
interface CompiledProgram {
  program: InstrumentResult;
  /** Runs the whole program body in a fresh scope and returns its top-level bindings. */
  run(hooks: TracerHooks): Exports;
}
interface MethodTarget {
  self: unknown;
  call(args: JsonValue[]): unknown;
}

/** Parameters a top-level declaration of the same name would collide with are left out (the user's binding wins). */
function compile(program: InstrumentResult): CompiledProgram {
  const declared = new Set(program.topLevelNames);
  const globals = sandboxParameters(SANDBOX_HELPERS).filter(([name]) => !declared.has(name));
  const body = `"use strict";${program.code}\n;return {${program.topLevelNames.join(",")}};`;
  const factory = new Function(...globals.map(([name]) => name), program.hooksName, body) as (...args: unknown[]) => Exports;
  const values = globals.map(([, value]) => value);
  return { program, run: (hooks) => factory(...values, hooks) };
}

function describeThrown(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === "string") return `Uncaught ${error}`;
  try {
    return `Uncaught ${JSON.stringify(toJsonValue(error))}`;
  } catch {
    return `Uncaught ${typeof error} value`;
  }
}

function toCompileError(error: unknown): RunError {
  if (error instanceof TracerSyntaxError) return { kind: "syntax", message: error.message, line: error.line, column: error.column };
  if (error instanceof SyntaxError) return { kind: "syntax", message: error.message, line: null, column: null };
  return { kind: "setup", message: `Could not prepare the code for tracing: ${describeThrown(error)}`, line: null, column: null };
}

function toRunError(error: unknown, runtime: TraceRuntime): RunError {
  const line = runtime.lastLine;
  const limit = runtime.limitError ?? (error instanceof TraceLimitError ? error : null);
  if (limit) return { kind: limit.kind, message: limit.message, line, column: null };
  if (error instanceof SetupError) return { kind: "setup", message: error.message, line: null, column: null };
  const isStackOverflow = error instanceof Error && STACK_OVERFLOW_ERRORS.has(error.name) && STACK_OVERFLOW_MESSAGE.test(error.message);
  return { kind: isStackOverflow ? "depth-limit" : "runtime", message: describeThrown(error), line, column: null };
}

function asArgs(value: unknown): JsonValue[] {
  return Array.isArray(value) ? (value as JsonValue[]) : [];
}

function blankOp(index: number, name: unknown, args: unknown, expected: JsonValue | undefined): OpResult {
  return { index, name: String(name), args: asArgs(args), expected: expected ?? null, actual: null, isPassed: false, firstStep: null, lastStep: null };
}

function initialOps(testCase: TestCase): OpResult[] {
  if (!isDesignCase(testCase)) return [blankOp(0, testCase.method, testCase.args, testCase.expected)];
  const ops: unknown[] = Array.isArray(testCase.ops) ? testCase.ops : [];
  const args: unknown[] = Array.isArray(testCase.args) ? testCase.args : [];
  const expected: JsonValue[] = Array.isArray(testCase.expected) ? testCase.expected : [];
  return ops.map((name, index) => blankOp(index, name, args[index], expected[index]));
}

/** Validates a case's shape (it arrives over the worker boundary); null when fine. */
function caseProblem(testCase: TestCase): string | null {
  if (!isDesignCase(testCase)) {
    if (typeof testCase.method !== "string" || testCase.method === "") return "`method` must be a function name";
    return Array.isArray(testCase.args) ? null : "`args` must be an array of arguments";
  }
  const { ops, args, expected } = testCase;
  if (!Array.isArray(ops) || ops.length === 0 || !ops.every((op) => typeof op === "string")) {
    return "`ops` must be a non-empty array of method names";
  }
  if (!Array.isArray(args) || args.length !== ops.length || !args.every(Array.isArray)) return "`args` needs one argument array per op";
  return Array.isArray(expected) && expected.length === ops.length ? null : "`expected` needs one value per op";
}

function memberLine(program: InstrumentResult, className: string | null, member: string): number {
  const method = program.functions.find((fn) => fn.className === className && fn.name === member);
  const owner =
    program.classes.find((cls) => cls.name === className) ??
    program.functions.find((fn) => fn.className === null && fn.name === className);
  return method?.line ?? owner?.line ?? FIRST_LINE;
}

/** ops[0] names the constructor but is ignored: `Solution`, else the first top-level class, else a function named ops[0]. */
function designClassName(program: InstrumentResult, constructorOp: string): string | null {
  if (program.topLevelNames.includes(SOLUTION_CLASS_NAME)) return SOLUTION_CLASS_NAME;
  if (program.classes.length > 0) return program.classes[0].name;
  return program.topLevelNames.includes(constructorOp) ? constructorOp : null;
}

function construct(exports: Exports, className: string | null, args: JsonValue[]): object {
  const target = className !== null && hasOwn(exports, className) ? exports[className] : undefined;
  if (typeof target !== "function") {
    throw new SetupError(className === null ? "No class found: define `class Solution { ... }`" : `"${className}" is not a class`);
  }
  return reflectConstruct(target, args);
}

/** A member the solution defines: own property on `start`'s prototype chain before Object.prototype (no builtins). */
function findUserMember(start: object, name: string): unknown {
  for (let owner: object | null = start; owner !== null && owner !== objectPrototype; owner = getPrototypeOf(owner) as object | null) {
    if (hasOwn(owner, name)) return reflectGet(start, name);
  }
  return undefined;
}

function callMethod(instance: object, name: string, args: JsonValue[]): unknown {
  if (name === CONSTRUCTOR_NAME) throw new SetupError(CONSTRUCTOR_OP_MESSAGE);
  const method = findUserMember(instance, name);
  if (typeof method !== "function") throw new SetupError(`Method "${name}" is not defined on the class`);
  return reflectApply(method, instance, args);
}

/** Method cases: a method of class `Solution`, else a top-level function (or variable holding one). */
function resolveMethodTarget(exports: Exports, method: string): MethodTarget {
  if (method === CONSTRUCTOR_NAME) throw new SetupError(CONSTRUCTOR_OP_MESSAGE);
  const solution = hasOwn(exports, SOLUTION_CLASS_NAME) ? exports[SOLUTION_CLASS_NAME] : undefined;
  const prototype: unknown = typeof solution === "function" ? reflectGet(solution, "prototype") : undefined;
  const isSolutionMethod = typeof prototype === "object" && prototype !== null && typeof findUserMember(prototype, method) === "function";
  if (typeof solution === "function" && isSolutionMethod) {
    const instance: object = reflectConstruct(solution, []);
    return { self: instance, call: (args) => callMethod(instance, method, args) };
  }
  const fn = hasOwn(exports, method) ? exports[method] : undefined;
  if (typeof fn !== "function") throw new SetupError(`Function "${method}" is not defined`);
  return { self: undefined, call: (args) => reflectApply(fn, undefined, args) };
}

/** Runs one op between op-start/op-end snapshots; failures become a RunError plus an error step. */
function runOp(runtime: TraceRuntime, op: OpResult, line: number, self: unknown, invoke: () => unknown): RunError | null {
  runtime.beginOp(op.index, op.name, line, self);
  try {
    const value = invoke();
    if (runtime.limitError) throw runtime.limitError; // user code caught the limit error and carried on
    op.actual = toJsonValue(value);
    op.isPassed = deepEqual(value, op.expected);
    runtime.endOp(value);
    if (runtime.limitError) throw runtime.limitError; // hit while serializing the op-end snapshot (Proxy traps)
    return null;
  } catch (error) {
    restoreBuiltins(PRISTINE_BUILTINS); // the case ends here: handling must not trip over builtins the solution replaced
    const runError = toRunError(error, runtime);
    runtime.failOp(runError.message);
    return runError;
  }
}

/** Op 0 of a design case: evaluates the program, then `new Class(...args[0])`; actual is always null. */
function runConstructor(
  compiled: CompiledProgram,
  runtime: TraceRuntime,
  op: OpResult,
  className: string | null,
  line: number,
): { instance: object | null; error: RunError | null } {
  let instance: object | null = null;
  const error = runOp(runtime, op, line, undefined, () => {
    const exports = runtime.runTopLevel(() => compiled.run(runtime.hooks));
    instance = construct(exports, className, cloneArgs(op.args));
    runtime.setOpSelf(instance);
    return null;
  });
  return { instance, error };
}

function runDesignOps(compiled: CompiledProgram, runtime: TraceRuntime, ops: OpResult[]): RunError | null {
  const className = designClassName(compiled.program, ops[0].name);
  // Resolved before any solution code runs (it may replace Array methods); the loop below uses indices only.
  const lines = ops.map((op, index) => memberLine(compiled.program, className, index === 0 ? CONSTRUCTOR_NAME : op.name));
  const { instance, error } = runConstructor(compiled, runtime, ops[0], className, lines[0]);
  if (error || !instance) return error;
  for (let index = 1; index < ops.length; index++) {
    const op = ops[index];
    const failure = runOp(runtime, op, lines[index], instance, () => callMethod(instance, op.name, cloneArgs(op.args)));
    if (failure) return failure;
  }
  return null;
}

function runMethodOp(compiled: CompiledProgram, runtime: TraceRuntime, op: OpResult): RunError | null {
  const { program } = compiled;
  const isSolutionMethod = program.functions.some((fn) => fn.className === SOLUTION_CLASS_NAME && fn.name === op.name);
  const line = memberLine(program, isSolutionMethod ? SOLUTION_CLASS_NAME : null, op.name);
  return runOp(runtime, op, line, undefined, () => {
    const exports = runtime.runTopLevel(() => compiled.run(runtime.hooks));
    const target = resolveMethodTarget(exports, op.name);
    runtime.setOpSelf(target.self);
    return target.call(cloneArgs(op.args));
  });
}

function isTestCaseObject(value: unknown): value is TestCase {
  return typeof value === "object" && value !== null;
}

function runCase(
  compiled: CompiledProgram,
  rawCase: unknown,
  index: number,
  limits: RunLimits,
  isTraced: boolean,
): { result: CaseResult; trace: Trace | null } {
  restoreBuiltins(PRISTINE_BUILTINS);
  const startedAt = clock();
  const runtime = new TraceRuntime({ limits, isRecording: isTraced });
  const testCase = isTestCaseObject(rawCase) ? rawCase : null;
  const ops = testCase ? initialOps(testCase) : [];
  const problem = testCase ? caseProblem(testCase) : NOT_AN_OBJECT_PROBLEM;
  let error: RunError | null = problem ? { kind: "setup", message: `Invalid test case: ${problem}`, line: null, column: null } : null;
  try {
    if (testCase && !problem) {
      error = isDesignCase(testCase) ? runDesignOps(compiled, runtime, ops) : runMethodOp(compiled, runtime, ops[0]);
    }
  } catch (crash) {
    restoreBuiltins(PRISTINE_BUILTINS);
    error = toRunError(crash, runtime); // the harness itself broke (e.g. on builtins the solution replaced)
  } finally {
    restoreBuiltins(PRISTINE_BUILTINS);
    runtime.close();
  }
  for (const op of ops) Object.assign(op, runtime.stepRange(op.index));
  const result: CaseResult = {
    index,
    isPassed: error === null && ops.every((op) => op.isPassed),
    ops,
    stepCount: runtime.stepCount,
    durationMs: clock() - startedAt,
    error,
  };
  return { result, trace: isTraced ? runtime.toTrace(index) : null };
}

/**
 * Instruments the code once, then runs every case on a fresh program scope (per-case failures never
 * abort other cases). Pure and synchronous: used by the worker and by tests. Trace only for traceCaseIndex.
 */
export function executeRun(request: RunRequest): RunReport {
  if (!Array.isArray(request.testCases)) {
    return { compileError: { kind: "setup", message: "Invalid request: `testCases` must be an array", line: null, column: null }, cases: [], trace: null };
  }
  const limits = resolveLimits(request.limits);
  let compiled: CompiledProgram;
  try {
    compiled = compile(instrument(request.code));
  } catch (error) {
    return { compileError: toCompileError(error), cases: [], trace: null };
  }
  const cases: CaseResult[] = [];
  let trace: Trace | null = null;
  for (let index = 0; index < request.testCases.length; index++) {
    const outcome = runCase(compiled, request.testCases[index], index, limits, index === request.traceCaseIndex);
    cases.push(outcome.result);
    trace = outcome.trace ?? trace;
  }
  return { compileError: null, cases, trace };
}
