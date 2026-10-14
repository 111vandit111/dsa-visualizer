"use client";

import type { ReactNode } from "react";
import { ChevronRightIcon, CornerDownLeftIcon } from "lucide-react";
import type { SValue, TraceFrame, TraceStep, VisualHints } from "@/lib/tracer/types";
import { localKey } from "@/lib/viz/diff";
import type { CellStatus } from "@/lib/viz/types";
import { cn } from "@/lib/utils";
import { ChangeHalo } from "./renderers/change-halo";
import { ValueView } from "./renderers/value-view";
import { useViz, VizProvider } from "./renderers/viz-context";

interface VariablesPanelProps {
  step: TraceStep;
  previousStep: TraceStep | undefined;
  hints: VisualHints;
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

/** A primitive variable as a compact `name = value` chip. */
function PrimitiveVariable({ name, value, path, status }: VariableProps) {
  return (
    <li className={cn(ROW_CLASS, "inline-flex items-baseline gap-1.5 px-2.5 py-1.5")}>
      <ChangeHalo status={status ?? null} />
      <span className="font-mono text-[13px] text-foreground">{name}</span>
      <span className="font-mono text-muted-foreground">=</span>
      <ValueView value={value} path={path} />
    </li>
  );
}

/** A container variable: its name, then its renderer below. */
function ContainerVariable({ name, value, path, status }: VariableProps) {
  return (
    <li className={cn(ROW_CLASS, "p-2.5")}>
      <ChangeHalo status={status ?? null} />
      <span className="font-mono text-[13px] text-foreground">{name}</span>
      <div className="mt-1.5 min-w-0">
        <ValueView value={value} path={path} />
      </div>
    </li>
  );
}

interface VariableProps {
  name: string;
  value: SValue;
  path: string;
  status: CellStatus | undefined;
}

function Variable(props: VariableProps) {
  return props.value.k === "ref" ? <ContainerVariable {...props} /> : <PrimitiveVariable {...props} />;
}

/** Primitives first as chips, then containers as cards (each group keeps declaration order). */
function LocalsList({ frame }: { frame: TraceFrame }) {
  const { localFlags } = useViz();
  if (frame.locals.length === 0) return <p className="text-sm text-muted-foreground">No variables yet.</p>;
  const toVariable = (local: TraceFrame["locals"][number]) => (
    <Variable
      key={local.name}
      name={local.name}
      value={local.value}
      path={`${frame.name}/${local.name}`}
      status={localFlags.get(localKey(frame.id, local.name))}
    />
  );
  const primitives = frame.locals.filter((local) => local.value.k !== "ref");
  const containers = frame.locals.filter((local) => local.value.k === "ref");
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
        className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left font-mono text-xs outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 max-sm:min-h-11"
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
export function VariablesPanel({ step, previousStep, hints }: VariablesPanelProps) {
  return (
    <section data-testid="variables-panel" aria-label="Variables" className="rounded-xl border border-border bg-card/60 p-3 surface-hairline">
      <VizProvider step={step} previousStep={previousStep} hints={hints}>
        <PanelBody step={step} />
      </VizProvider>
    </section>
  );
}
