"use client";

import { InfoIcon, XCircleIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { RunError, RunReport, Trace } from "@/lib/tracer/types";
import { describeRunError } from "@/lib/viz/run-errors";

interface RunNoticesProps {
  report: RunReport | null;
  caseIndex: number;
  trace: Trace | null;
  /** The worker itself failed (timeout, crash), as opposed to the user's code failing. */
  runFailure: Error | null;
  onRetry: () => void;
}

function ErrorNotice({ title, detail }: { title: string; detail: string }) {
  return (
    <Alert variant="destructive">
      <XCircleIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="font-mono break-words">{detail}</AlertDescription>
    </Alert>
  );
}

function RunErrorNotice({ error }: { error: RunError }) {
  const { title, detail } = describeRunError(error);
  return <ErrorNotice title={title} detail={detail} />;
}

const NOTICE_TRANSITION_S = 0.2;

/**
 * Everything that stops or limits the trace: failed worker, compile error, error in the selected case, truncation.
 * Opens and closes with a height animation (bottom padding is inside, so no margin jumps when it toggles).
 */
export function RunNotices({ report, caseIndex, trace, runFailure, onRetry }: RunNoticesProps) {
  const isReduced = useReducedMotion();
  const compileError = report?.compileError ?? null;
  const caseError = report?.cases[caseIndex]?.error ?? null;
  const isTruncated = trace?.isTruncated === true;
  const hasNotices = Boolean(runFailure || compileError || caseError || isTruncated);
  const transition = { duration: isReduced ? 0 : NOTICE_TRANSITION_S, ease: "easeOut" } as const;
  return (
    <AnimatePresence initial={false}>
      {hasNotices ? (
        <motion.div
          key="notices"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={transition}
          className="overflow-hidden"
        >
          <div data-testid="player-error" className="space-y-2 pb-4" role="status">
            {runFailure ? (
              <div className="space-y-2">
                <ErrorNotice title="The code runner stopped" detail={runFailure.message} />
                <Button variant="outline" size="sm" onClick={onRetry}>
                  Run again
                </Button>
              </div>
            ) : null}
            {compileError ? <RunErrorNotice error={compileError} /> : null}
            {caseError ? <RunErrorNotice error={caseError} /> : null}
            {isTruncated && trace ? (
              <Alert>
                <InfoIcon />
                <AlertTitle>Trace shortened</AlertTitle>
                <AlertDescription>
                  Only the first {trace.steps.length} steps are recorded to keep the page fast. The test case itself ran to the end.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
