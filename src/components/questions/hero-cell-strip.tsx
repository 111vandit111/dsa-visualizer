"use client";

import { useEffect, useReducer } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

const INITIAL_CELLS: readonly number[] = [5, 2, 7, 1, 8, 3, 6, 4];
const TICK_MS = 650;
const HOLD_TICKS = 4;

interface StripState {
  cells: readonly number[];
  scanIndex: number;
  sortedFrom: number;
  holdTicks: number;
  comparedAt: number | null;
}

const INITIAL_STATE: StripState = {
  cells: INITIAL_CELLS,
  scanIndex: 0,
  sortedFrom: INITIAL_CELLS.length,
  holdTicks: 0,
  comparedAt: null,
};

function advance(state: StripState): StripState {
  if (state.sortedFrom <= 1) {
    const holdTicks = state.holdTicks + 1;
    return holdTicks >= HOLD_TICKS ? INITIAL_STATE : { ...state, holdTicks, comparedAt: null };
  }
  const { scanIndex, sortedFrom } = state;
  const cells = [...state.cells];
  if (cells[scanIndex] > cells[scanIndex + 1]) {
    [cells[scanIndex], cells[scanIndex + 1]] = [cells[scanIndex + 1], cells[scanIndex]];
  }
  const isPassDone = scanIndex + 1 >= sortedFrom - 1;
  return {
    ...state,
    cells,
    comparedAt: scanIndex,
    scanIndex: isPassDone ? 0 : scanIndex + 1,
    sortedFrom: isPassDone ? sortedFrom - 1 : sortedFrom,
  };
}

function cellTone(index: number, state: StripState): string {
  const { comparedAt } = state;
  if (comparedAt !== null && (index === comparedAt || index === comparedAt + 1)) {
    return "glow-primary border-primary bg-primary/10 text-primary";
  }
  if (index >= state.sortedFrom) return "border-primary/30 bg-card text-primary/80";
  return "border-border bg-card text-muted-foreground";
}

/** Decorative bubble-sort loop; static under prefers-reduced-motion. */
export function HeroCellStrip() {
  const shouldReduceMotion = useReducedMotion();
  const [state, tick] = useReducer(advance, INITIAL_STATE);

  useEffect(() => {
    if (shouldReduceMotion) return;
    const timer = setInterval(tick, TICK_MS);
    return () => clearInterval(timer);
  }, [shouldReduceMotion]);

  const displayed = shouldReduceMotion ? INITIAL_STATE : state;

  return (
    <div aria-hidden="true" className="flex max-w-full gap-1 sm:gap-1.5">
      {displayed.cells.map((value, index) => (
        <motion.div
          key={value}
          layout={!shouldReduceMotion}
          transition={spring.snappy}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md border font-mono text-sm transition-colors sm:size-11 sm:text-base",
            cellTone(index, displayed),
          )}
        >
          {value}
        </motion.div>
      ))}
    </div>
  );
}
