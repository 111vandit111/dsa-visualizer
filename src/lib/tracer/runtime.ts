import { DEADLINE_CHECK_EVERY } from "./constants";
import { SafeSnapshot, serializeFrame, snapshotCost, type LiveFrame, type ValueBox } from "./instrument-snapshot";
import { createSerializeContext, type SerializeContext } from "./serializer";
import type { RunLimits, StepKind, Trace, TraceStep } from "./types";

/** Built lazily by instrumented code: `[name, getter]` per visible binding plus a `this` getter. */
export interface ScopeView {
  l: [string, () => unknown][];
  s: () => unknown;
}
export type ScopeReader = () => ScopeView;

/** The `__t` object instrumented code calls (see instrument.ts for where each hook is inserted). */
export interface TracerHooks {
  step(line: number, read: ScopeReader): void;
  loop(line: number, read: ScopeReader): void;
  enter(name: string, line: number, read: ScopeReader): void;
  ret<T>(line: number, value: T): T;
  fall(line: number): void;
  exit(): void;
  /** Anonymous expression arrows: counts toward the limits, records nothing. */
  tick(line: number): void;
}

export type LimitErrorKind = "step-limit" | "timeout" | "depth-limit";

export class TraceLimitError extends Error {
  readonly kind: LimitErrorKind;

  constructor(kind: LimitErrorKind, message: string) {
    super(message);
    this.name = "TraceLimitError";
    this.kind = kind;
  }
}

export interface RuntimeOptions {
  limits: RunLimits;
  /** false = "check" mode: counts steps and enforces limits but records nothing. */
  isRecording: boolean;
  now?: () => number;
}

export interface StepRange {
  firstStep: number | null;
  lastStep: number | null;
}

const TOP_LEVEL_NAME = "(top level)";
const FIRST_LINE = 1;
/** Deep recursion: only the innermost frames carry locals (keeps snapshots linear in depth). */
const MAX_DETAILED_FRAMES = 32;
/** Total serialized nodes one trace may hold; past it recording stops (Trace.isTruncated). */
const MAX_TRACE_NODES = 200_000;
/** Captured at load: solution code may replace the global `performance` during a case. */
const defaultClock = performance.now.bind(performance);

/**
 * Per-case tracer state: hook implementations, shadow call stack, step/time/depth limits and the
 * snapshot recorder. Stack layout: [op frame, (top level | user frames...)]; the synthetic op frame
 * (op name, `self` = instance) is only shown while no user frame is active (op-start / op-end).
 * Solution code may replace builtins mid-case, so the hot paths use index writes and plain loops
 * instead of Array/Map methods.
 */
export class TraceRuntime {
  readonly hooks: TracerHooks;
  private readonly limits: RunLimits;
  private readonly isRecording: boolean;
  private readonly now: () => number;
  private readonly startedAt: number;
  private readonly context: SerializeContext = createSerializeContext();
  private readonly stack: LiveFrame[] = [];
  private readonly steps: TraceStep[] = [];
  private readonly ranges: (StepRange | undefined)[] = [];
  private nextFrameId = 1;
  private recordedNodes = 0;
  private depth = 0;
  private opIndex = 0;
  private executed = 0;
  private line: number | null = null;
  private isTruncated = false;
  private isSuspended = false;
  private isClosed = false;
  private failure: TraceLimitError | null = null;

  constructor(options: RuntimeOptions) {
    this.limits = options.limits;
    this.isRecording = options.isRecording;
    this.now = options.now ?? defaultClock;
    this.startedAt = this.now();
    this.hooks = {
      step: (line, read) => this.onStep("step", line, read),
      loop: (line, read) => this.onStep("loop", line, read),
      enter: (name, line, read) => this.onEnter(name, line, read),
      ret: (line, value) => {
        this.onReturn(line, { value });
        return value;
      },
      fall: (line) => this.onReturn(line, { value: undefined }),
      exit: () => this.onExit(),
      tick: (line) => this.tick(line),
    };
  }

  get stepCount(): number {
    return this.executed;
  }

  /** Line of the last executed hook in the current op (null if none ran yet). */
  get lastLine(): number | null {
    return this.line;
  }

  /** Set once a limit was hit; stays set even if user code caught the thrown error. */
  get limitError(): TraceLimitError | null {
    return this.failure;
  }

  stepRange(opIndex: number): StepRange {
    return this.ranges[opIndex] ?? { firstStep: null, lastStep: null };
  }

  toTrace(caseIndex: number): Trace {
    return { caseIndex, steps: this.steps, isTruncated: this.isTruncated };
  }

  /** Starts op `opIndex` with a synthetic frame named after the op; `self` is the instance (if any yet). */
  beginOp(opIndex: number, name: string, line: number, self: unknown): void {
    this.opIndex = opIndex;
    this.line = null;
    this.resetStack();
    this.stack[this.stack.length] = { id: this.nextFrameId++, name, line, read: null, self };
    this.record("op-start", line, null);
  }

  setOpSelf(self: unknown): void {
    const opFrame = this.stack[0];
    if (opFrame) opFrame.self = self;
  }

  endOp(returnValue: unknown): void {
    const opFrame = this.stack[0];
    if (this.stack.length > 1) this.stack.length = 1;
    this.depth = 0;
    if (opFrame) opFrame.line = this.line ?? opFrame.line;
    this.record("op-end", opFrame?.line ?? FIRST_LINE, { value: returnValue });
    this.resetStack();
  }

  /**
   * Always ends the trace with the error step, even past the recording caps (at the step cap it replaces
   * the last step). It reuses the last snapshot (the state where it failed) or, if recording had stopped
   * before, a fresh snapshot of what is still on the stack.
   */
  failOp(message: string): void {
    const line = this.line ?? this.stack[0]?.line ?? FIRST_LINE;
    const fresh = this.isRecording && this.isTruncated ? this.capture(null) : null;
    this.resetStack();
    if (!this.isRecording || this.limits.maxRecordedSteps === 0) return;
    const last = this.steps[this.steps.length - 1];
    if (this.steps.length >= this.limits.maxRecordedSteps) this.dropLastStep();
    this.push({
      index: this.steps.length,
      kind: "error",
      line,
      opIndex: this.opIndex,
      frames: fresh?.frames ?? last?.frames ?? [],
      objects: fresh?.objects ?? last?.objects ?? {},
      message,
    });
  }

  /** Runs the program body with a "(top level)" frame on the stack. */
  runTopLevel<T>(run: () => T): T {
    const baseLength = this.stack.length;
    this.stack[baseLength] = { id: this.nextFrameId++, name: TOP_LEVEL_NAME, line: FIRST_LINE, read: null, self: undefined };
    try {
      return run();
    } finally {
      this.stack.length = baseLength;
    }
  }

  /**
   * Ends the case: nothing is recorded afterwards. Async continuations that outlive the run stay
   * untraced but still count against the step/time limits, so a runaway one is stopped.
   */
  close(): void {
    this.isClosed = true;
  }

  private resetStack(): void {
    this.stack.length = 0;
    this.depth = 0;
  }

  private onStep(kind: StepKind, line: number, read: ScopeReader): void {
    this.tick(line);
    if (this.isSuspended) return;
    const frame = this.stack[this.stack.length - 1];
    if (frame) {
      frame.line = line;
      frame.read = read;
    }
    this.record(kind, line, null);
  }

  private onEnter(name: string, line: number, read: ScopeReader): void {
    if (this.isSuspended) return this.tick(line);
    // Checked before tick() moves lastLine, so the error points at the recursive call site.
    if (this.depth >= this.limits.maxCallDepth && !this.failure) {
      this.fail("depth-limit", `Maximum call depth of ${this.limits.maxCallDepth} exceeded (infinite recursion?)`);
    }
    this.tick(line);
    this.depth++;
    this.stack[this.stack.length] = { id: this.nextFrameId++, name, line, read, self: undefined };
    this.record("call", line, null);
  }

  private onReturn(line: number, returned: ValueBox): void {
    this.tick(line);
    if (this.isSuspended) return;
    const frame = this.stack[this.stack.length - 1];
    if (frame) frame.line = line;
    this.record("return", line, returned);
  }

  /** Pairs with a successful enter (enter throws before pushing, so a failed enter never reaches exit). */
  private onExit(): void {
    if (this.isSuspended || this.depth === 0) return;
    this.depth--;
    this.stack.length -= 1;
  }

  private tick(line: number): void {
    if (this.failure) throw this.failure;
    this.line = line;
    if (this.executed >= this.limits.maxSteps) {
      this.fail("step-limit", `Step limit of ${this.limits.maxSteps} exceeded (infinite loop?)`);
    }
    this.executed++;
    const isDeadlineCheck = this.executed % DEADLINE_CHECK_EVERY === 0;
    if (isDeadlineCheck && this.now() - this.startedAt >= this.limits.caseTimeoutMs) {
      this.fail("timeout", `Time limit of ${this.limits.caseTimeoutMs} ms exceeded`);
    }
  }

  private fail(kind: LimitErrorKind, message: string): never {
    this.failure = new TraceLimitError(kind, message);
    throw this.failure;
  }

  private visibleFrames(): LiveFrame[] {
    if (this.stack.length <= 1) return this.stack;
    const visible: LiveFrame[] = [];
    for (let index = 1; index < this.stack.length; index++) visible[index - 1] = this.stack[index];
    return visible;
  }

  /** Serializes the visible frames. Can run user code (Proxy traps): hooks it fires only count toward the limits. */
  private capture(returned: ValueBox | null): Pick<TraceStep, "frames" | "objects" | "returnValue"> {
    this.isSuspended = true;
    try {
      const snapshot = new SafeSnapshot(this.context);
      const visible = this.visibleFrames();
      const firstDetailed = visible.length - MAX_DETAILED_FRAMES;
      const frames: TraceStep["frames"] = [];
      for (let index = 0; index < visible.length; index++) {
        frames[index] = serializeFrame(visible[index], snapshot, index >= firstDetailed);
      }
      const returnValue = returned ? snapshot.serialize(returned.value) : undefined;
      return { frames, objects: snapshot.objects(), returnValue };
    } finally {
      this.isSuspended = false;
    }
  }

  private record(kind: StepKind, line: number, returned: ValueBox | null): void {
    if (!this.isRecording || this.isClosed || this.isTruncated) return;
    if (this.steps.length >= this.limits.maxRecordedSteps) {
      this.isTruncated = true;
      return;
    }
    const { frames, objects, returnValue } = this.capture(returned);
    const step: TraceStep = { index: this.steps.length, kind, line, opIndex: this.opIndex, frames, objects };
    if (returnValue) step.returnValue = returnValue;
    this.pushWithinBudget(step);
  }

  private pushWithinBudget(step: TraceStep): void {
    const cost = snapshotCost(step);
    if (this.recordedNodes + cost > MAX_TRACE_NODES) {
      this.isTruncated = true;
      return;
    }
    this.recordedNodes += cost;
    this.push(step);
  }

  private dropLastStep(): void {
    const removed = this.steps[this.steps.length - 1];
    if (!removed) return;
    this.steps.length -= 1;
    const range = this.ranges[removed.opIndex];
    const isOnlyStep = !range || range.firstStep === null || range.firstStep >= removed.index;
    this.ranges[removed.opIndex] = isOnlyStep ? undefined : { firstStep: range.firstStep, lastStep: removed.index - 1 };
  }

  private push(step: TraceStep): void {
    this.steps[this.steps.length] = step;
    const range = this.ranges[step.opIndex];
    this.ranges[step.opIndex] = { firstStep: range?.firstStep ?? step.index, lastStep: step.index };
  }
}
