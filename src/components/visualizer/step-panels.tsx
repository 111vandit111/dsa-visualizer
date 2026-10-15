"use client";

import { useMemo } from "react";
import { PlayIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { Trace, VisualHints } from "@/lib/tracer/types";
import { buildPathModel } from "@/lib/viz/paths";
import { buildPointerModel } from "@/lib/viz/pointers";
import { CallStack } from "./call-stack";
import { PointerLegend } from "./pointer-legend";
import { VariablesPanel } from "./variables-panel";

interface StepPanelsProps {
  trace: Trace | null;
  stepIndex: number;
  hints: VisualHints;
  /** The solution source: pointer detection reads how variables are used as indices. */
  code: string;
  isRunning: boolean;
}

/** Pointer and path models for a trace, built once per (trace, code) so scrubbing only looks them up. */
function useOverlayModels(trace: Trace | null, code: string) {
  return useMemo(() => {
    if (!trace) return null;
    const pointerModel = buildPointerModel(trace, code);
    return { pointerModel, pathModel: buildPathModel(trace, pointerModel.slotCount, pointerModel.indexVarNames) };
  }, [trace, code]);
}

/** Right zone: variables and call stack of the shown step, or a loading / empty state. */
export function StepPanels({ trace, stepIndex, hints, code, isRunning }: StepPanelsProps) {
  const models = useOverlayModels(trace, code);
  if (isRunning) {
    return (
      <div data-testid="variables-loading" className="space-y-3" aria-busy="true" aria-label="Running your code">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }
  const step = trace?.steps[stepIndex];
  if (!trace || !step || !models) {
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
      <PointerLegend pointers={models.pointerModel.at(step.index)} objects={step.objects} />
      <VariablesPanel
        step={step}
        previousStep={trace.steps[stepIndex - 1]}
        hints={hints}
        pointerModel={models.pointerModel}
        pathModel={models.pathModel}
      />
    </div>
  );
}
