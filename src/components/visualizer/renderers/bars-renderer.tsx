"use client";

import { motion, useReducedMotion } from "framer-motion";
import { spring } from "@/lib/motion";
import { computeBars, type BarGeometry } from "@/lib/viz/bars";
import { VIZ_LIMITS } from "@/lib/viz/constants";
import { cellStatus } from "@/lib/viz/diff";
import { truncateText } from "@/lib/viz/format";
import { objectHost, type Pointer, type PointerRange } from "@/lib/viz/overlay-types";
import { itemsOf } from "@/lib/viz/structures";
import type { CellStatus } from "@/lib/viz/types";
import { cn } from "@/lib/utils";
import { OutOfRangeChips, pointersPastCells, rangeCovering } from "./array-renderer";
import { ChangeHalo } from "./change-halo";
import { gutterStyle } from "./pointer-gutter";
import { PointerMarks } from "./pointer-marks";
import { pointerRing, pointerStyle } from "./pointer-styles";
import type { RendererProps } from "./renderer-types";
import { MoreChip } from "./small-chips";
import { TONE_STYLES } from "./tones";
import { useViz } from "./viz-context";
import { ViewToggle } from "./view-toggle";

/** With more bars than this, value labels are shown only on pointed or changed bars. */
const LABEL_LIMIT = 24;
/** With more bars than this, labels and indices are hidden on small screens (columns are too narrow). */
const NARROW_LABEL_LIMIT = 12;
/** With more bars than this, the index is printed under every INDEX_STEP-th bar only. */
const INDEX_LIMIT = 24;
const INDEX_STEP = 5;
const LABEL_MAX_CHARS = 6;
const ARIA_VALUES = 12;
const PERCENT = 100;

interface BarColumnProps {
  index: number;
  value: number;
  label: string;
  geometry: BarGeometry;
  baselineFraction: number;
  barCount: number;
  status: CellStatus | null;
  pointers: readonly Pointer[];
  range: PointerRange | null;
}

function percent(fraction: number): string {
  return `${fraction * PERCENT}%`;
}

function BarColumn({ index, value, label, geometry, baselineFraction, barCount, status, pointers, range }: BarColumnProps) {
  const isReduced = useReducedMotion();
  const isMarked = pointers.length > 0 || status !== null;
  const isLabelShown = barCount <= LABEL_LIMIT || isMarked;
  const isIndexShown = barCount <= INDEX_LIMIT || index % INDEX_STEP === 0 || pointers.length > 0;
  const bottom = geometry.isNegative ? baselineFraction - geometry.fraction : baselineFraction;
  const tone = TONE_STYLES[geometry.isNegative ? "violet" : "cyan"];
  return (
    <div className="relative flex min-w-[6px] max-w-12 flex-1 flex-col">
      {range ? (
        <span
          aria-hidden="true"
          data-testid="range-band"
          title={`${range.start.name}..${range.end.name}`}
          style={pointerStyle(range.start.slot)}
          className="ptr-tint pointer-events-none absolute -inset-x-px -inset-y-1 -z-10"
        />
      ) : null}
      <div className="relative h-36 sm:h-44">
        {baselineFraction > 0 ? <span aria-hidden="true" className="absolute inset-x-0 border-t border-border" style={{ bottom: percent(baselineFraction) }} /> : null}
        <motion.div
          data-testid={`bar-${index}`}
          data-value={value}
          initial={{ height: "0%", bottom: percent(baselineFraction) }}
          animate={{ height: percent(geometry.fraction), bottom: percent(bottom) }}
          transition={isReduced ? { duration: 0 } : spring.soft}
          style={pointers.length > 0 ? pointerRing(pointers) : undefined}
          className={cn("absolute inset-x-0 min-h-[2px] rounded-sm border", tone.border, tone.surface)}
        >
          <ChangeHalo status={status} />
          {isLabelShown ? (
            <span
              className={cn(
                "absolute left-1/2 -translate-x-1/2 font-mono text-[10px] leading-none whitespace-nowrap",
                geometry.isNegative ? "top-full mt-0.5" : "bottom-full mb-0.5",
                tone.text,
                barCount > NARROW_LABEL_LIMIT && !isMarked && "max-sm:hidden",
              )}
            >
              {truncateText(label, LABEL_MAX_CHARS)}
            </span>
          ) : null}
        </motion.div>
      </div>
      <div className="relative mt-1 flex h-3 justify-center">
        {isIndexShown ? (
          <span className={cn("micro-label text-[10px] leading-3 tracking-normal", barCount > NARROW_LABEL_LIMIT && pointers.length === 0 && "max-sm:hidden")}>
            {index}
          </span>
        ) : null}
        <PointerMarks pointers={pointers} placement="below" />
      </div>
    </div>
  );
}

function summary(values: readonly number[], total: number): string {
  const listed = values.slice(0, ARIA_VALUES).join(", ");
  return `Bar chart of ${total} values: ${listed}${total > ARIA_VALUES ? ", ..." : ""}`;
}

/** A numeric array drawn as a bar chart (histogram): bar height = value, spring-animated between steps. */
export function BarsRenderer({ object, path }: RendererProps) {
  const { diff, pointers } = useViz();
  const { items, total } = itemsOf(object);
  const shown = items.slice(0, VIZ_LIMITS.maxBars);
  const values = shown.map((item) => (item.k === "number" ? item.v : 0));
  const layout = computeBars(values);
  const host = objectHost(object.id);
  const cellPointers = shown.map((_, index) => pointers.at(host, String(index)));
  const outOfRange = pointers.outOfRange(host);
  const ranges = pointers.ranges(host);
  const maxPerCell = cellPointers.reduce((most, list) => Math.max(most, list.length), 0);
  return (
    <div data-testid="renderer-bars" className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <OutOfRangeChips pointers={[...pointersPastCells(pointers, host, shown.length), ...outOfRange]} />
          <MoreChip count={total - shown.length} />
        </div>
        <ViewToggle path={path} mode="bars" />
      </div>
      <div className="overflow-x-auto overscroll-x-contain px-1">
        <div role="img" aria-label={summary(values, total)} style={gutterStyle(maxPerCell, "bottom")} className="isolate flex items-stretch gap-[2px] pt-5 sm:gap-1">
          {shown.map((_, index) => (
            <BarColumn
              key={index}
              index={index}
              value={values[index]}
              label={String(values[index])}
              geometry={layout.bars[index]}
              baselineFraction={layout.baselineFraction}
              barCount={shown.length}
              status={cellStatus(diff, object.id, String(index))}
              pointers={cellPointers[index]}
              range={rangeCovering(ranges, index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
