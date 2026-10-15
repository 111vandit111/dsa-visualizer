"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Popover } from "radix-ui";
import { VIZ_LIMITS } from "@/lib/viz/constants";
import { summarizeValue } from "@/lib/viz/format";
import type { ObjectTable } from "@/lib/viz/types";
import type { Pointer } from "@/lib/viz/overlay-types";
import { cn } from "@/lib/utils";
import { pointerStyle } from "./pointer-styles";
import { useViz } from "./viz-context";

const MARK_FADE_S = 0.15;
const MARK_SLIDE_PX = 6;
/** Long names are cut with an ellipsis (the title and the legend keep the full name) so a chip never outgrows its cell. */
const CHIP_CLASS = "inline-block max-w-full truncate rounded px-[3px] align-top font-mono text-[10px] leading-[14px]";
const OVERFLOW_CLASS =
  "pointer-events-auto relative cursor-pointer rounded border border-border bg-card px-1 font-mono text-[10px] leading-[14px] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 max-sm:before:absolute max-sm:before:-inset-3.5";
const POPOVER_CLASS =
  "z-50 max-w-[min(22rem,calc(100vw-1rem))] rounded-md border border-border bg-popover p-2 text-popover-foreground surface-hairline outline-none";
const POPOVER_GAP_PX = 6;
const VIEWPORT_PADDING_PX = 8;

type Placement = "above" | "below";

/** `i = 2`, plus where it lives when that is not obvious from the chip. */
function pointerTitle(pointer: Pointer, objects: ObjectTable): string {
  const notes = [pointer.isActive ? null : "caller frame", pointer.isOutOfRange ? "out of range" : null].filter(Boolean);
  const suffix = notes.length > 0 ? ` (${notes.join(", ")})` : "";
  return `${pointer.name} = ${summarizeValue(objects, pointer.value)}${suffix}`;
}

interface PointerTagProps {
  pointer: Pointer;
  /** Also print the value (`i=5`): for chips that are not on a cell, like out-of-range pointers. */
  hasValue?: boolean;
  className?: string;
}

/** A pointer's name as an inline chip. */
export function PointerTag({ pointer, hasValue = false, className }: PointerTagProps) {
  const { objects } = useViz();
  return (
    <span
      data-testid="pointer-mark"
      data-pointer={pointer.name}
      data-slot={pointer.slot}
      data-active={pointer.isActive}
      title={pointerTitle(pointer, objects)}
      style={pointerStyle(pointer.slot)}
      className={cn(CHIP_CLASS, pointer.isActive ? "ptr-chip" : "ptr-chip-dim", className)}
    >
      {hasValue ? `${pointer.name}=${summarizeValue(objects, pointer.value)}` : pointer.name}
    </span>
  );
}

/** Pointers of the innermost frame first, so the dimmed caller-frame ones are the first to fold into "+n". */
function activeFirst(pointers: readonly Pointer[]): Pointer[] {
  return [...pointers.filter((pointer) => pointer.isActive), ...pointers.filter((pointer) => !pointer.isActive)];
}

interface MarkProps {
  pointer: Pointer;
  placement: Placement;
  hasCaret: boolean;
  slidePx: number;
}

function Mark({ pointer, placement, hasCaret, slidePx }: MarkProps) {
  const isAbove = placement === "above";
  const offset = isAbove ? -slidePx : slidePx;
  const caret = hasCaret ? (
    <span
      aria-hidden="true"
      className={cn(
        "size-0 border-x-[3px] border-x-transparent",
        isAbove ? "border-t-[4px] border-t-(--ptr)" : "border-b-[4px] border-b-(--ptr)",
        !pointer.isActive && "ptr-dim",
      )}
    />
  ) : null;
  return (
    <motion.span
      initial={{ opacity: 0, y: offset }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: offset }}
      transition={{ duration: MARK_FADE_S, ease: "easeOut" }}
      style={pointerStyle(pointer.slot)}
      className="pointer-events-auto flex max-w-full flex-col items-center"
    >
      {isAbove ? null : caret}
      <PointerTag pointer={pointer} />
      {isAbove ? caret : null}
    </motion.span>
  );
}

/** The "+n" chip: a button that opens the full list, so keyboard and touch users can read what folded away. */
function OverflowChip({ hiddenCount, pointers }: { hiddenCount: number; pointers: readonly Pointer[] }) {
  const { objects } = useViz();
  const lines = pointers.map((pointer) => ({ pointer, text: pointerTitle(pointer, objects) }));
  return (
    <Popover.Root>
      <Popover.Trigger
        type="button"
        data-testid="pointer-overflow"
        aria-label={`${hiddenCount} more pointers. All ${pointers.length}: ${lines.map((line) => line.text).join(", ")}`}
        title={lines.map((line) => line.text).join("\n")}
        className={OVERFLOW_CLASS}
      >
        +{hiddenCount}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side="top" sideOffset={POPOVER_GAP_PX} collisionPadding={VIEWPORT_PADDING_PX} className={POPOVER_CLASS}>
          <ul data-testid="pointer-overflow-list" className="space-y-1 font-mono text-[11px]">
            {lines.map(({ pointer, text }) => (
              <li key={`${pointer.frameId}:${pointer.name}`} style={pointerStyle(pointer.slot)} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full bg-(--ptr)", !pointer.isActive && "ptr-dim")} />
                <span className="min-w-0 break-words">{text}</span>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

interface PointerMarksProps {
  pointers: readonly Pointer[];
  placement?: Placement;
  className?: string;
}

/**
 * Name chips for the pointers on one cell, stacked above (or below) it with a caret on the nearest one.
 * Absolutely positioned inside the nearest `relative` parent, so adding or removing a chip never moves the layout.
 * Shows the first `maxPointerTags`, then a `+n` chip whose title lists all of them.
 */
export function PointerMarks({ pointers, placement = "above", className }: PointerMarksProps) {
  const isReduced = useReducedMotion();
  if (pointers.length === 0) return null;
  const ordered = activeFirst(pointers);
  const shown = ordered.slice(0, VIZ_LIMITS.maxPointerTags);
  const hiddenCount = ordered.length - shown.length;
  const isAbove = placement === "above";
  return (
    <div
      role="group"
      aria-label={`Pointers: ${ordered.map((pointer) => pointer.name).join(", ")}`}
      className={cn(
        // One cell wide (plus half the gap on each side): chips of neighbouring cells can never overlap.
        "pointer-events-none absolute left-1/2 z-10 flex w-[calc(100%+4px)] min-w-10 -translate-x-1/2 items-center gap-0.5",
        isAbove ? "bottom-full mb-0.5 flex-col-reverse" : "top-full mt-0.5 flex-col",
        className,
      )}
    >
      <AnimatePresence initial={false}>
        {shown.map((pointer, index) => (
          <Mark
            key={`${pointer.frameId}:${pointer.name}`}
            pointer={pointer}
            placement={placement}
            hasCaret={index === 0}
            slidePx={isReduced ? 0 : MARK_SLIDE_PX}
          />
        ))}
      </AnimatePresence>
      {hiddenCount > 0 ? <OverflowChip hiddenCount={hiddenCount} pointers={ordered} /> : null}
    </div>
  );
}
