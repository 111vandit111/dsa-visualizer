import { DEFAULT_RUN_LIMITS, WORKER_WATCHDOG_MS } from "./constants";
import type { RunLimits, RunRequest } from "./types";

const LIMIT_KEYS = ["maxRecordedSteps", "maxSteps", "maxCallDepth", "caseTimeoutMs"] as const;

/** Defaults overridden by every finite, non-negative value in `overrides` (they cross the worker boundary). */
export function resolveLimits(overrides: Partial<RunLimits> | undefined): RunLimits {
  const limits: RunLimits = { ...DEFAULT_RUN_LIMITS };
  for (const key of LIMIT_KEYS) {
    const value = overrides?.[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) limits[key] = Math.floor(value);
  }
  return limits;
}

/** Hard kill for a whole worker run: a base budget plus every case's own time limit, so long valid runs survive. */
export function runWatchdogMs(request: RunRequest): number {
  const caseCount = Array.isArray(request.testCases) ? request.testCases.length : 0;
  return WORKER_WATCHDOG_MS + caseCount * resolveLimits(request.limits).caseTimeoutMs;
}
