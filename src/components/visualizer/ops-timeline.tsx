"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2Icon, XCircleIcon } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import type { OpResult } from "@/lib/tracer/types";
import { formatJsonValue } from "@/lib/viz/format";
import { cn } from "@/lib/utils";

interface OpsTimelineProps {
  ops: readonly OpResult[];
  /** Op being executed at the shown step. */
  activeOpIndex: number | null;
  stepIndex: number;
  /** Jump the player to a step. */
  onSeek: (stepIndex: number) => void;
}

function opTitle(op: OpResult): string {
  return `${op.name}(${op.args.map((arg) => formatJsonValue(arg, 20)).join(", ")})`;
}

function OpCard({ op, isActive, isUpcoming, onSeek, register }: {
  op: OpResult;
  isActive: boolean;
  isUpcoming: boolean;
  onSeek: (stepIndex: number) => void;
  register: (element: HTMLButtonElement | null) => void;
}) {
  const hasRun = op.firstStep !== null;
  return (
    <li className="w-48 shrink-0 snap-start">
      <button
        ref={register}
        type="button"
        data-testid={`op-item-${op.index}`}
        aria-current={isActive ? "step" : undefined}
        disabled={!hasRun}
        onClick={() => op.firstStep !== null && onSeek(op.firstStep)}
        className={cn(
          "flex h-full w-full cursor-pointer flex-col gap-1 rounded-lg border px-3 py-2 text-left font-mono text-xs outline-none transition-colors",
          "focus-visible:ring-3 focus-visible:ring-ring/50 max-sm:min-h-11 disabled:cursor-not-allowed disabled:opacity-50",
          isActive ? "border-primary/60 bg-primary/10 glow-primary" : "border-border bg-card/60 hover:bg-muted",
          isUpcoming && !isActive && "opacity-60",
        )}
      >
        <span className="flex items-center gap-1.5">
          {op.isPassed ? (
            <CheckCircle2Icon className="size-3.5 shrink-0 text-success" aria-label="Passed" />
          ) : (
            <XCircleIcon className="size-3.5 shrink-0 text-destructive" aria-label="Failed" />
          )}
          <span className="micro-label text-[10px]">#{op.index}</span>
        </span>
        <span className="truncate text-[13px] text-foreground" title={opTitle(op)}>
          {opTitle(op)}
        </span>
        <span className={cn("truncate", op.isPassed ? "text-success" : "text-destructive")} title={formatJsonValue(op.actual, 200)}>
          got {formatJsonValue(op.actual)}
        </span>
        <span className="truncate text-muted-foreground" title={formatJsonValue(op.expected, 200)}>
          want {formatJsonValue(op.expected)}
        </span>
      </button>
    </li>
  );
}

/** Design-problem operations as a scroll-snap strip: result vs expected, active op highlighted, click to seek. */
export function OpsTimeline({ ops, activeOpIndex, stepIndex, onSeek }: OpsTimelineProps) {
  const containerRef = useRef<HTMLOListElement>(null);
  const itemRefs = useRef(new Map<number, HTMLButtonElement>());
  const isReduced = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    const item = activeOpIndex === null ? undefined : itemRefs.current.get(activeOpIndex);
    if (!container || !item) return;
    const left = item.offsetLeft - (container.clientWidth - item.clientWidth) / 2;
    container.scrollTo({ left: Math.max(left, 0), behavior: isReduced ? "auto" : "smooth" });
  }, [activeOpIndex, isReduced]);

  return (
    <section data-testid="ops-timeline" aria-label="Operations" className="space-y-2">
      <p className="micro-label">Operations · {ops.length}</p>
      <ol ref={containerRef} className="relative flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2">
        {ops.map((op) => (
          <OpCard
            key={op.index}
            op={op}
            isActive={op.index === activeOpIndex}
            isUpcoming={op.firstStep !== null && op.firstStep > stepIndex}
            onSeek={onSeek}
            register={(element) => {
              if (element) itemRefs.current.set(op.index, element);
              else itemRefs.current.delete(op.index);
            }}
          />
        ))}
      </ol>
    </section>
  );
}
