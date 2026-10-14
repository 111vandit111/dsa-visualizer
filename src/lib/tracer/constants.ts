import type { RunLimits } from "./types";
export const DEFAULT_RUN_LIMITS: RunLimits = { maxRecordedSteps: 2000, maxSteps: 200_000, maxCallDepth: 300, caseTimeoutMs: 2000 };
export const WORKER_WATCHDOG_MS = 15_000;      // main-thread hard kill of the whole worker run
export const DEADLINE_CHECK_EVERY = 256;       // runtime checks the clock every N steps
export const SERIALIZE_LIMITS = { maxObjects: 300, maxItemsPerContainer: 60, maxStringLength: 160 } as const;
export const JSON_VALUE_LIMITS = { maxDepth: 12, maxItems: 500 } as const;
export const FLOAT_TOLERANCE = 1e-5;
