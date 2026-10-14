import { executeRun } from "./execute";
import { lockDownGlobals } from "./instrument-sandbox";
import type { RunRequest, WorkerRequest, WorkerResponse } from "./types";

/** Hand-written: `DedicatedWorkerGlobalScope` does not exist with lib "dom", and lib "webworker" clashes with it. */
interface WorkerScope {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: WorkerResponse): void;
}

const scope = self as unknown as WorkerScope;
const UNKNOWN_REQUEST_ID = -1;
// Keep our own channel, then remove network/messaging capabilities before any solution code runs.
const post = scope.postMessage.bind(scope);
lockDownGlobals(self);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRunRequest(value: unknown): value is RunRequest {
  if (!isObject(value)) return false;
  const { code, testCases, traceCaseIndex, limits } = value;
  return (
    typeof code === "string" &&
    Array.isArray(testCases) &&
    testCases.every(isObject) &&
    (traceCaseIndex === null || typeof traceCaseIndex === "number") &&
    (limits === undefined || isObject(limits))
  );
}

function requestIdOf(value: unknown): number {
  return isObject(value) && typeof value.requestId === "number" ? value.requestId : UNKNOWN_REQUEST_ID;
}

function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

scope.onmessage = (event) => {
  const data: unknown = event.data;
  const requestId = requestIdOf(data);
  if (!isObject(data) || data.type !== "run" || requestId === UNKNOWN_REQUEST_ID || !isRunRequest(data.request)) {
    post({ type: "failure", requestId, message: "Malformed run request" });
    return;
  }
  try {
    post({ type: "result", requestId, report: executeRun(data.request) });
  } catch (error) {
    post({ type: "failure", requestId, message: `The tracer failed: ${describeError(error)}` });
  }
};
