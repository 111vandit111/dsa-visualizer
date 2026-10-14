import type { RunError, RunErrorKind } from "@/lib/tracer/types";

const TITLES: Record<RunErrorKind, string> = {
  syntax: "Syntax error",
  runtime: "Runtime error",
  "step-limit": "Step limit reached",
  timeout: "Timed out",
  "depth-limit": "Call depth exceeded",
  setup: "Could not run this test case",
};

export interface RunErrorText {
  title: string;
  /** The message, with the line number appended when known. */
  detail: string;
}

export function describeRunError(error: RunError): RunErrorText {
  const detail = error.line === null ? error.message : `${error.message} (line ${error.line})`;
  return { title: TITLES[error.kind], detail };
}
