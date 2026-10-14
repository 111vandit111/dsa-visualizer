import { PlayIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { Trace, VisualHints } from "@/lib/tracer/types";
import { CallStack } from "./call-stack";
import { VariablesPanel } from "./variables-panel";

interface StepPanelsProps {
  trace: Trace | null;
  stepIndex: number;
  hints: VisualHints;
  isRunning: boolean;
}

/** Right zone: variables and call stack of the shown step, or a loading / empty state. */
export function StepPanels({ trace, stepIndex, hints, isRunning }: StepPanelsProps) {
  if (isRunning) {
    return (
      <div data-testid="variables-loading" className="space-y-3" aria-busy="true" aria-label="Running your code">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }
  const step = trace?.steps[stepIndex];
  if (!trace || !step) {
    return (
      <EmptyState
        icon={<PlayIcon />}
        title="Nothing to step through"
        description="The selected case produced no steps. Check the message above, or pick another case."
      />
    );
  }
  return (
    <div className="space-y-4">
      <CallStack frames={step.frames} />
      <VariablesPanel step={step} previousStep={trace.steps[stepIndex - 1]} hints={hints} />
    </div>
  );
}
