import { runWatchdogMs } from "./instrument-limits";
import type { RunReport, RunRequest, WorkerRequest, WorkerResponse } from "./types";

export class RunTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`The run did not finish within ${timeoutMs} ms and was stopped.`);
    this.name = "RunTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export interface RunInWorkerOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

const ABORT_MESSAGE = "The run was cancelled.";
const CRASH_MESSAGE = "The code runner crashed.";
const UNREADABLE_MESSAGE = "The code runner sent a result that could not be read.";

let nextRequestId = 1;

function abortError(): DOMException {
  return new DOMException(ABORT_MESSAGE, "AbortError");
}

function awaitReport(worker: Worker, request: RunRequest, timeoutMs: number, signal: AbortSignal | undefined): Promise<RunReport> {
  const requestId = nextRequestId++;
  return new Promise<RunReport>((resolve, reject) => {
    const settle = (finish: () => void) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      finish();
    };
    const onAbort = () => settle(() => reject(abortError()));
    const timer = setTimeout(() => settle(() => reject(new RunTimeoutError(timeoutMs))), timeoutMs);
    signal?.addEventListener("abort", onAbort, { once: true });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      if (response.requestId !== requestId) return;
      settle(() => (response.type === "result" ? resolve(response.report) : reject(new Error(response.message))));
    };
    worker.onerror = (event) => {
      event.preventDefault();
      settle(() => reject(new Error(event.message || CRASH_MESSAGE)));
    };
    worker.onmessageerror = () => settle(() => reject(new Error(UNREADABLE_MESSAGE)));
    const message: WorkerRequest = { type: "run", requestId, request };
    try {
      worker.postMessage(message);
    } catch (error) {
      settle(() => reject(error));
    }
  });
}

/**
 * Runs a request in a fresh module worker (call from effects/handlers only: there is no Worker during SSR).
 * The worker is always terminated. Rejects with RunTimeoutError after `timeoutMs` (default: WORKER_WATCHDOG_MS
 * plus each case's time limit, so long valid runs survive), or an AbortError DOMException.
 */
export async function runInWorker(request: RunRequest, options: RunInWorkerOptions = {}): Promise<RunReport> {
  const { timeoutMs = runWatchdogMs(request), signal } = options;
  if (signal?.aborted) throw abortError();
  const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  try {
    return await awaitReport(worker, request, timeoutMs, signal);
  } finally {
    worker.terminate();
  }
}
