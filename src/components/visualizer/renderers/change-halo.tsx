"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { CellStatus } from "@/lib/viz/types";
import { cn } from "@/lib/utils";
import { HALO_FADE_S, HALO_STYLES } from "./tones";
import { useViz } from "./viz-context";

/**
 * Coloured glow that flashes on a cell/node that was added or changed by the current step, then fades.
 * Place inside a `relative` parent. Under reduced motion it stays on (static) for as long as the step is shown.
 */
export function ChangeHalo({ status }: { status: CellStatus | null }) {
  const { stepIndex } = useViz();
  const isReduced = useReducedMotion();
  if (!status) return null;
  return (
    <motion.span
      key={stepIndex}
      aria-hidden="true"
      data-halo={status}
      className={cn("pointer-events-none absolute -inset-px rounded-[inherit] border", HALO_STYLES[status])}
      initial={{ opacity: 1 }}
      animate={{ opacity: isReduced ? 1 : 0 }}
      transition={{ duration: HALO_FADE_S, ease: "easeOut" }}
    />
  );
}
