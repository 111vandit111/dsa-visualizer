export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export interface DesignTestCase { ops: string[]; args: JsonValue[][]; expected: JsonValue[] }   // ops[0] = constructor
export interface MethodTestCase { method: string; args: JsonValue[]; expected: JsonValue }
export type TestCase = DesignTestCase | MethodTestCase;
export function isDesignCase(testCase: TestCase): testCase is DesignTestCase { return "ops" in testCase; }

export const VISUAL_HINT_TYPES = ["heap", "tree", "array", "grid", "map", "set", "linkedlist"] as const;
export type VisualHintType = (typeof VISUAL_HINT_TYPES)[number];
export type VisualHints = Record<string, VisualHintType>;   // key: "this.tweetMap" | "minHeap" | "a.b.c" (see H)

// Serialized values. EVERY non-primitive is ALWAYS an SRef into step.objects (ids are stable for the whole case run).
export type SPrimitive =
  | { k: "undefined" } | { k: "null" } | { k: "boolean"; v: boolean } | { k: "number"; v: number }
  | { k: "bigint"; v: string } | { k: "string"; v: string } | { k: "symbol"; v: string }
  | { k: "function"; name: string }
  | { k: "opaque"; label: string };                       // Date(ISO)/RegExp/over-limit object ("…")
export interface SRef { k: "ref"; id: number }
export type SValue = SPrimitive | SRef;
export type SObject =                                      // items.length < length|size means truncated
  | { k: "array"; id: number; items: SValue[]; length: number }          // arrays + typed arrays; holes -> undefined
  | { k: "object"; id: number; className: string; entries: [string, SValue][]; size: number } // plain ("Object") + class instances (e.g. "Solution", "Twitter")
  | { k: "set"; id: number; items: SValue[]; size: number }
  | { k: "map"; id: number; entries: [SValue, SValue][]; size: number }
  | { k: "heap"; id: number; items: SValue[]; size: number };           // PriorityQueue INTERNAL binary-heap array order

export type StepKind = "op-start" | "call" | "step" | "loop" | "return" | "op-end" | "error";
export interface TraceFrame {
  id: number;                                   // unique per invocation (monotonic) -> stable React key
  name: string;                                 // "getNewsFeed", "Solution.constructor" -> "constructor", "(anonymous)", "(top level)"
  line: number;                                 // 1-based line currently executing in this frame (caller frames: call-site line)
  locals: { name: string; value: SValue }[];    // visible bindings incl. params, declaration order, excludes function/class declarations; TDZ/uninitialised omitted
  self: SValue;                                 // `this` ({k:"undefined"} when none)
}
export interface TraceStep {
  index: number;                                // === position in Trace.steps
  kind: StepKind;
  line: number;                                 // 1-based ORIGINAL source line to highlight (top frame); instrumentation never shifts lines
  opIndex: number;                              // index into the case's ops (0 for method cases)
  frames: TraceFrame[];                         // outermost -> innermost; innermost is the active frame
  objects: Record<number, SObject>;             // heap table for THIS step; every SRef in frames resolves here
  returnValue?: SValue;                         // kind "return" | "op-end"
  message?: string;                             // kind "error"
}
export interface Trace { caseIndex: number; steps: TraceStep[]; isTruncated: boolean }  // truncated = maxRecordedSteps hit (execution continued)

export type RunErrorKind = "syntax" | "runtime" | "step-limit" | "timeout" | "depth-limit" | "setup";
export interface RunError { kind: RunErrorKind; message: string; line: number | null; column: number | null }
export interface OpResult {
  index: number; name: string; args: JsonValue[]; expected: JsonValue; actual: JsonValue; isPassed: boolean;
  firstStep: number | null; lastStep: number | null;   // Trace.steps range for this op (traced case only, else null)
}
export interface CaseResult {                    // method cases have exactly one op; constructor is op 0 for design cases (actual null)
  index: number; isPassed: boolean; ops: OpResult[]; stepCount: number; durationMs: number; error: RunError | null;
}
export interface RunLimits { maxRecordedSteps: number; maxSteps: number; maxCallDepth: number; caseTimeoutMs: number }
export interface RunRequest { code: string; testCases: TestCase[]; traceCaseIndex: number | null; limits?: Partial<RunLimits> }
export interface RunReport {                     // compileError != null  =>  cases = [], trace = null
  compileError: RunError | null; cases: CaseResult[]; trace: Trace | null;
}
export type WorkerRequest = { type: "run"; requestId: number; request: RunRequest };
export type WorkerResponse =
  | { type: "result"; requestId: number; report: RunReport }
  | { type: "failure"; requestId: number; message: string };
