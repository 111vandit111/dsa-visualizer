"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { TraceStep, VisualHints } from "@/lib/tracer/types";
import { detectRenderType } from "@/lib/viz/detect";
import { diffLocals, diffObjects, type StepDiff } from "@/lib/viz/diff";
import { resolveHintTargets } from "@/lib/viz/hints";
import type { CellStatus, ObjectTable, RenderType } from "@/lib/viz/types";

interface VizContextValue {
  objects: ObjectTable;
  /** Index of the shown step: restarts the change-halo animations. */
  stepIndex: number;
  diff: StepDiff;
  /** Variables that changed since the previous step, keyed by `localKey`. */
  localFlags: ReadonlyMap<string, CellStatus>;
  typeOf: (id: number) => RenderType | null;
  isExpanded: (path: string, fallback: boolean) => boolean;
  setExpanded: (path: string, isExpanded: boolean) => void;
}

const VizContext = createContext<VizContextValue | null>(null);

interface VizProviderProps {
  step: TraceStep;
  previousStep: TraceStep | undefined;
  hints: VisualHints;
  children: ReactNode;
}

export function VizProvider({ step, previousStep, hints, children }: VizProviderProps) {
  const [expansion, setExpansion] = useState<Record<string, boolean>>({});
  const diff = useMemo(() => diffObjects(previousStep?.objects, step.objects), [previousStep, step]);
  const localFlags = useMemo(() => diffLocals(previousStep, step), [previousStep, step]);
  const hintTargets = useMemo(() => resolveHintTargets(step, hints), [step, hints]);

  const typeOf = useCallback(
    (id: number) => detectRenderType(step.objects, { k: "ref", id }, hintTargets.get(id)),
    [step, hintTargets],
  );
  const isExpanded = useCallback((path: string, fallback: boolean) => expansion[path] ?? fallback, [expansion]);
  const setExpanded = useCallback(
    (path: string, isOpen: boolean) => setExpansion((current) => ({ ...current, [path]: isOpen })),
    [],
  );

  const value = useMemo<VizContextValue>(
    () => ({ objects: step.objects, stepIndex: step.index, diff, localFlags, typeOf, isExpanded, setExpanded }),
    [step, diff, localFlags, typeOf, isExpanded, setExpanded],
  );
  return <VizContext.Provider value={value}>{children}</VizContext.Provider>;
}

export function useViz(): VizContextValue {
  const value = useContext(VizContext);
  if (!value) throw new Error("useViz must be used inside <VizProvider>");
  return value;
}
