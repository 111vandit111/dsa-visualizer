"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Pointer } from "@/lib/viz/overlay-types";
import type { CellStatus } from "@/lib/viz/types";
import { ChangeHalo } from "./change-halo";
import { PointerMarks } from "./pointer-marks";
import { pointerRing } from "./pointer-styles";
import { TONE_STYLES, type Tone } from "./tones";

interface ValueCellProps {
  status: CellStatus | null;
  tone: Tone;
  /** Small label under the cell (array index). */
  caption?: string;
  isEmphasized?: boolean;
  /** Live variables pointing at this cell: a persistent ring and name chips (no change when empty). */
  pointers?: readonly Pointer[];
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
export function ValueCell({ status, tone, caption, isEmphasized = false, pointers, className, testId, trailing, onHoverChange, children }: ValueCellProps) {
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
          style={pointers ? pointerRing(pointers) : undefined}
        >
          <ChangeHalo status={status} />
          {children}
          {pointers && pointers.length > 0 ? <PointerMarks pointers={pointers} /> : null}
        </div>
        {caption === undefined ? null : <span className="micro-label text-[10px] tracking-wider">{caption}</span>}
      </div>
      {trailing}
    </motion.div>
  );
}
