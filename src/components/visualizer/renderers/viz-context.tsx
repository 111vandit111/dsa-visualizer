"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { TraceStep, VisualHints } from "@/lib/tracer/types";
import { detectRenderType } from "@/lib/viz/detect";
import { diffLocals, diffObjects, type StepDiff } from "@/lib/viz/diff";
import { resolveHintTargets } from "@/lib/viz/hints";
import type { PathModel, PointerModel, StepPaths, StepPointers, ViewMode } from "@/lib/viz/overlay-types";
import { localNamesByObject } from "@/lib/viz/pointers";
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
  /** Live variables that point at cells of this step (persistent rings/name tags, unlike the change halo). */
  pointers: StepPointers;
  paths: StepPaths;
  /** The variable name that holds this object (locals first, then `this.<field>`). */
  nameOf: (objectId: number) => string | null;
  /** The view the user picked for the renderer at `path` (null: renderer's own choice). */
  viewModeOf: (path: string) => ViewMode | null;
  setViewMode: (path: string, mode: ViewMode | null) => void;
}

const VizContext = createContext<VizContextValue | null>(null);

interface VizProviderProps {
  step: TraceStep;
  previousStep: TraceStep | undefined;
  hints: VisualHints;
  pointerModel: PointerModel;
  pathModel: PathModel;
  children: ReactNode;
}

export function VizProvider({ step, previousStep, hints, pointerModel, pathModel, children }: VizProviderProps) {
  const [expansion, setExpansion] = useState<Record<string, boolean>>({});
  const [viewModes, setViewModes] = useState<Record<string, ViewMode>>({});
  const diff = useMemo(() => diffObjects(previousStep?.objects, step.objects), [previousStep, step]);
  const localFlags = useMemo(() => diffLocals(previousStep, step), [previousStep, step]);
  const hintTargets = useMemo(() => resolveHintTargets(step, hints), [step, hints]);

  const objectNames = useMemo(() => localNamesByObject(step), [step]);
  const typeOf = useCallback(
    (id: number) => detectRenderType(step.objects, { k: "ref", id }, hintTargets.get(id), objectNames.get(id)),
    [step, hintTargets, objectNames],
  );
  const isExpanded = useCallback((path: string, fallback: boolean) => expansion[path] ?? fallback, [expansion]);
  const setExpanded = useCallback(
    (path: string, isOpen: boolean) => setExpansion((current) => ({ ...current, [path]: isOpen })),
    [],
  );

  const pointers = useMemo(() => pointerModel.at(step.index), [pointerModel, step]);
  const paths = useMemo(() => pathModel.at(step.index), [pathModel, step]);
  const nameOf = useCallback((objectId: number) => objectNames.get(objectId) ?? null, [objectNames]);
  const viewModeOf = useCallback((path: string) => viewModes[path] ?? null, [viewModes]);
  const setViewMode = useCallback(
    (path: string, mode: ViewMode | null) =>
      setViewModes((current) => {
        const next = { ...current };
        if (mode === null) delete next[path];
        else next[path] = mode;
        return next;
      }),
    [],
  );

  const value = useMemo<VizContextValue>(
    () => ({
      objects: step.objects,
      stepIndex: step.index,
      diff,
      localFlags,
      typeOf,
      isExpanded,
      setExpanded,
      pointers,
      paths,
      nameOf,
      viewModeOf,
      setViewMode,
    }),
    [step, diff, localFlags, typeOf, isExpanded, setExpanded, pointers, paths, nameOf, viewModeOf, setViewMode],
  );
  return <VizContext.Provider value={value}>{children}</VizContext.Provider>;
}

export function useViz(): VizContextValue {
  const value = useContext(VizContext);
  if (!value) throw new Error("useViz must be used inside <VizProvider>");
  return value;
}
