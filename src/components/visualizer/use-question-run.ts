"use client";

import { useAsync } from "@/hooks/use-async";
import { runInWorker } from "@/lib/tracer/client";
import type { RunReport, Trace } from "@/lib/tracer/types";
import type { Question } from "@/lib/types/question";

export interface QuestionRun {
  /** Latest finished report (kept while the next case is running). */
  report: RunReport | null;
  /** Trace of the selected case; null while it is running, or when nothing could be traced. */
  trace: Trace | null;
  isRunning: boolean;
  /** The worker itself failed (timeout, crash); user-code failures are in `report`. */
  failure: Error | null;
  rerun: () => void;
}

/**
 * Runs the solution against all test cases in a Web Worker, tracing `caseIndex`. A new worker starts when the
 * question or case changes; the in-flight one is aborted and terminated on change and on unmount.
 */
export function useQuestionRun(question: Question, caseIndex: number): QuestionRun {
  const run = useAsync<RunReport>(
    (signal) =>
      runInWorker({ code: question.solutionCode, testCases: question.testCases, traceCaseIndex: caseIndex }, { signal }),
    [question, caseIndex],
  );
  const report = run.data ?? null;
  const trace = report?.trace && report.trace.caseIndex === caseIndex ? report.trace : null;
  return { report, trace: run.isLoading ? null : trace, isRunning: run.isLoading, failure: run.error, rerun: run.reload };
}
