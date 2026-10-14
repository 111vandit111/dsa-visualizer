"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { CellStatus } from "@/lib/viz/types";
import { ChangeHalo } from "./change-halo";
import { TONE_STYLES, type Tone } from "./tones";

interface ValueCellProps {
  status: CellStatus | null;
  tone: Tone;
  /** Small label under the cell (array index). */
  caption?: string;
  isEmphasized?: boolean;
  className?: string;
  testId?: string;
  /** Shown to the right of the cell (e.g. a list arrow). */
  trailing?: ReactNode;
  /** Called when the pointer or keyboard focus enters/leaves the cell. */
  onHoverChange?: (isActive: boolean) => void;
  children: ReactNode;
}

const ENTER = { opacity: 0, scale: 0.85 };
const SETTLED = { opacity: 1, scale: 1 };

/** One animated cell: fades/scales in when added, out when removed, flashes a halo when changed. */
export function ValueCell({ status, tone, caption, isEmphasized = false, className, testId, trailing, onHoverChange, children }: ValueCellProps) {
  const style = TONE_STYLES[tone];
  return (
    <motion.div
      layout="position"
      data-testid={testId}
      initial={ENTER}
      animate={SETTLED}
      exit={ENTER}
      transition={spring.snappy}
      className="flex items-start gap-1.5"
      onPointerEnter={onHoverChange && (() => onHoverChange(true))}
      onPointerLeave={onHoverChange && (() => onHoverChange(false))}
    >
      <div className="flex flex-col items-center gap-1">
        <div
          className={cn(
            "relative flex min-h-9 min-w-9 items-center justify-center rounded-md border px-2.5 py-1",
            style.border,
            style.surface,
            isEmphasized && style.glow,
            className,
          )}
        >
          <ChangeHalo status={status} />
          {children}
        </div>
        {caption === undefined ? null : <span className="micro-label text-[10px] tracking-wider">{caption}</span>}
      </div>
      {trailing}
    </motion.div>
  );
}
