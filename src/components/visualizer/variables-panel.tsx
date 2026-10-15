"use client";

import { useMemo, type ReactNode } from "react";
import { ChevronRightIcon, CornerDownLeftIcon } from "lucide-react";
import type { SValue, TraceFrame, TraceStep, VisualHints } from "@/lib/tracer/types";
import { localKey } from "@/lib/viz/diff";
import { stringHost, type PathModel, type Pointer, type PointerModel, type StepPointers } from "@/lib/viz/overlay-types";
import type { CellStatus } from "@/lib/viz/types";
import { cn } from "@/lib/utils";
import { legendPointers, pointerKey } from "./pointer-legend";
import { ChangeHalo } from "./renderers/change-halo";
import { pointerStyle } from "./renderers/pointer-styles";
import { StringRenderer } from "./renderers/string-renderer";
import { ValueView } from "./renderers/value-view";
import { useViz, VizProvider } from "./renderers/viz-context";

interface VariablesPanelProps {
  step: TraceStep;
  previousStep: TraceStep | undefined;
  hints: VisualHints;
  pointerModel: PointerModel;
  pathModel: PathModel;
}

function PanelSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <p className="micro-label">{label}</p>
      {children}
    </section>
  );
}

const ROW_CLASS = "relative rounded-lg border border-border bg-card/60";

/** A small dot in the colour of the variable's pointer, so a name can be matched to its chips in the views. */
function PointerDot({ pointer }: { pointer: Pointer }) {
  return (
    <span
      aria-hidden="true"
      data-pointer-dot={pointer.name}
      style={pointerStyle(pointer.slot)}
      className={cn("mr-1.5 inline-block size-2 rounded-full bg-(--ptr)", !pointer.isActive && "ptr-dim")}
    />
  );
}

function VariableName({ name, pointer }: { name: string; pointer: Pointer | undefined }) {
  return (
    <span className="font-mono text-[13px] text-foreground">
      {pointer ? <PointerDot pointer={pointer} /> : null}
      {name}
    </span>
  );
}

/** A primitive variable as a compact `name = value` chip. */
function PrimitiveVariable({ name, value, path, status, pointer }: VariableProps) {
  return (
    <li className={cn(ROW_CLASS, "inline-flex items-baseline gap-1.5 px-2.5 py-1.5")}>
      <ChangeHalo status={status ?? null} />
      <VariableName name={name} pointer={pointer} />
      <span className="font-mono text-muted-foreground">=</span>
      <ValueView value={value} path={path} />
    </li>
  );
}

/** A container variable (or a string with pointers on its characters): its name, then its renderer below. */
function ContainerVariable({ name, value, path, status, pointer, frameId }: VariableProps) {
  return (
    <li className={cn(ROW_CLASS, "p-2.5")}>
      <ChangeHalo status={status ?? null} />
      <VariableName name={name} pointer={pointer} />
      <div className="mt-1.5 min-w-0">
        {value.k === "string" && frameId !== undefined ? (
          <StringRenderer frameId={frameId} name={name} value={value.v} />
        ) : (
          <ValueView value={value} path={path} />
        )}
      </div>
    </li>
  );
}

interface VariableProps {
  name: string;
  value: SValue;
  path: string;
  status: CellStatus | undefined;
  /** The pointer this variable is (its colour dot), if any. */
  pointer?: Pointer;
  /** Frame the variable lives in (strings need it to find their pointers). */
  frameId?: number;
}

/** A string is drawn as cells (not a chip) only when a pointer targets one of its characters. */
function isPointedString(pointers: StepPointers, frameId: number | undefined, name: string, value: SValue): boolean {
  if (value.k !== "string" || frameId === undefined) return false;
  const host = stringHost(frameId, name);
  return pointers.all.some((pointer) => pointer.target.host === host);
}

function isContainerLocal(pointers: StepPointers, frameId: number, local: TraceFrame["locals"][number]): boolean {
  return local.value.k === "ref" || isPointedString(pointers, frameId, local.name, local.value);
}

function Variable(props: VariableProps) {
  const { pointers } = useViz();
  const isContainer = props.value.k === "ref" || isPointedString(pointers, props.frameId, props.name, props.value);
  return isContainer ? <ContainerVariable {...props} /> : <PrimitiveVariable {...props} />;
}

/** The pointer each variable is, keyed by `pointerKey` (frame id + name). */
function usePointersByVariable(): ReadonlyMap<string, Pointer> {
  const { pointers } = useViz();
  return useMemo(() => new Map(legendPointers(pointers).map((pointer) => [pointerKey(pointer), pointer])), [pointers]);
}

/** Primitives first as chips, then containers as cards (each group keeps declaration order). */
function LocalsList({ frame }: { frame: TraceFrame }) {
  const { localFlags, pointers } = useViz();
  const pointersByVariable = usePointersByVariable();
  if (frame.locals.length === 0) return <p className="text-sm text-muted-foreground">No variables yet.</p>;
  const toVariable = (local: TraceFrame["locals"][number]) => (
    <Variable
      key={local.name}
      name={local.name}
      value={local.value}
      path={`${frame.name}/${local.name}`}
      status={localFlags.get(localKey(frame.id, local.name))}
      pointer={pointersByVariable.get(pointerKey({ frameId: frame.id, name: local.name }))}
      frameId={frame.id}
    />
  );
  const primitives = frame.locals.filter((local) => !isContainerLocal(pointers, frame.id, local));
  const containers = frame.locals.filter((local) => isContainerLocal(pointers, frame.id, local));
  return (
    <div className="space-y-2">
      {primitives.length > 0 ? <ul className="flex flex-wrap gap-2">{primitives.map(toVariable)}</ul> : null}
      {containers.length > 0 ? <ul className="space-y-2">{containers.map(toVariable)}</ul> : null}
    </div>
  );
}

function CallerFrame({ frame }: { frame: TraceFrame }) {
  const { isExpanded, setExpanded } = useViz();
  const path = `caller/${frame.id}`;
  const isOpen = isExpanded(path, false);
  return (
    <li className="rounded-lg border border-border bg-muted/30">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setExpanded(path, !isOpen)}
        className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left font-mono text-xs outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 max-sm:min-h-12"
      >
        <ChevronRightIcon className={cn("size-3.5 shrink-0 transition-transform", isOpen && "rotate-90")} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{frame.name}</span>
        <span className="text-muted-foreground">:{frame.line}</span>
      </button>
      {isOpen ? (
        <div className="space-y-2 px-3 pb-3">
          {frame.self.k === "undefined" ? null : (
            <ul>
              <Variable name="this" value={frame.self} path={`${path}/this`} status={undefined} />
            </ul>
          )}
          <LocalsList frame={frame} />
        </div>
      ) : null}
    </li>
  );
}

function ReturnValue({ value }: { value: SValue }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-viz-cyan/30 bg-viz-cyan/5 px-3 py-2">
      <CornerDownLeftIcon className="size-3.5 text-viz-cyan" aria-hidden="true" />
      <span className="micro-label">returns</span>
      <div className="min-w-0 flex-1">
        <ValueView value={value} path="return" />
      </div>
    </div>
  );
}

function PanelBody({ step }: { step: TraceStep }) {
  const active = step.frames[step.frames.length - 1];
  const callers = step.frames.slice(0, -1).reverse();
  if (!active) return <p className="text-sm text-muted-foreground">No frame is active at this step.</p>;
  return (
    <div className="space-y-4">
      <PanelSection label={`Locals · ${active.name}`}>
        <LocalsList frame={active} />
      </PanelSection>
      {active.self.k === "undefined" ? null : (
        <PanelSection label="this">
          <ValueView value={active.self} path="this" />
        </PanelSection>
      )}
      {step.returnValue ? <ReturnValue value={step.returnValue} /> : null}
      {callers.length > 0 ? (
        <PanelSection label="Caller frames">
          <ul className="space-y-1.5">
            {callers.map((frame) => (
              <CallerFrame key={frame.id} frame={frame} />
            ))}
          </ul>
        </PanelSection>
      ) : null}
    </div>
  );
}

/** Everything alive at the shown step: `this`, the active frame's locals, the return value, collapsed callers. */
export function VariablesPanel({ step, previousStep, hints, pointerModel, pathModel }: VariablesPanelProps) {
  return (
    <section data-testid="variables-panel" aria-label="Variables" className="rounded-xl border border-border bg-card/60 p-3 surface-hairline">
      <VizProvider step={step} previousStep={previousStep} hints={hints} pointerModel={pointerModel} pathModel={pathModel}>
        <PanelBody step={step} />
      </VizProvider>
    </section>
  );
}
