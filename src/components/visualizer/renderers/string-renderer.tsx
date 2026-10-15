"use client";

import { VIZ_LIMITS } from "@/lib/viz/constants";
import { stringHost, type Pointer, type PointerRange, type StepPointers } from "@/lib/viz/overlay-types";
import { cn } from "@/lib/utils";
import { PointerTag } from "./pointer-marks";
import { pointerStyle } from "./pointer-styles";
import { EmptyChip } from "./small-chips";
import { PRIMITIVE_TEXT } from "./tones";
import { ValueCell } from "./value-cell";
import { useViz } from "./viz-context";

/** Strings longer than this show their first characters and "+n more". */
const MAX_STRING_CELLS = 60;
/** Room a name chip stack needs above a cell: one chip row, and the caret. */
const MARK_ROW_PX = 18;
const MARK_CARET_PX = 6;
/** Characters that would be invisible or break the cell, shown as a symbol. */
const VISIBLE_CHARS: Readonly<Record<string, string>> = { " ": "␣", "\n": "↵", "\t": "⇥", "\r": "␍" };
const MORE_CHIP_CLASS =
  "inline-flex min-h-7 items-center rounded-md border border-dashed border-border px-2 font-mono text-xs text-muted-foreground";

/** In-range pointers whose character is past the last drawn cell: listed after "+n more". */
function pointersPastCells(pointers: StepPointers, host: string, cellCount: number): Pointer[] {
  return pointers.all.filter(
    (pointer) => pointer.target.host === host && !pointer.isOutOfRange && pointer.target.cellKey !== null && Number(pointer.target.cellKey) >= cellCount,
  );
}

const HIGH_SURROGATES = [0xd800, 0xdbff] as const;
const LOW_SURROGATES = [0xdc00, 0xdfff] as const;
const CONTINUATION = "·";

const isIn = (code: number, [low, high]: readonly [number, number]): boolean => code >= low && code <= high;

/**
 * What cell `index` (a UTF-16 code unit, like pointer indices) shows: a surrogate pair is drawn whole in its
 * high-surrogate cell, and its low-surrogate cell is a muted continuation dot, so a glyph is never split.
 */
function cellText(value: string, index: number): { text: string; isContinuation: boolean } {
  const code = value.charCodeAt(index);
  if (isIn(code, HIGH_SURROGATES) && isIn(value.charCodeAt(index + 1), LOW_SURROGATES)) return { text: value.slice(index, index + 2), isContinuation: false };
  if (isIn(code, LOW_SURROGATES) && isIn(value.charCodeAt(index - 1), HIGH_SURROGATES)) return { text: CONTINUATION, isContinuation: true };
  return { text: value.charAt(index), isContinuation: false };
}

interface RangeUnderlineProps {
  range: PointerRange;
  index: number;
}

/** The part of a window's tinted underline that sits under one character. */
function RangeUnderline({ range, index }: RangeUnderlineProps) {
  const isStart = index === range.from;
  const isEnd = index === range.to;
  return (
    <span
      aria-hidden="true"
      data-range={`${range.from}-${range.to}`}
      style={pointerStyle(range.start.slot)}
      className={cn(
        "h-[3px] self-stretch bg-(--ptr)/60",
        // Half of the flex gap on each inner side: the underline runs unbroken across the window.
        !isStart && "-ml-[3px]",
        !isEnd && "-mr-[3px]",
        isStart && "rounded-l-full",
        isEnd && "rounded-r-full",
      )}
    />
  );
}

interface StringCharProps {
  char: string;
  isContinuation: boolean;
  index: number;
  pointers: readonly Pointer[];
  ranges: readonly PointerRange[];
}

function StringChar({ char, isContinuation, index, pointers, ranges }: StringCharProps) {
  const covering = ranges.filter((range) => range.from <= index && index <= range.to).slice(0, VIZ_LIMITS.maxPointerTags);
  return (
    <div className="flex flex-col items-center gap-0.5">
      <ValueCell
        status={null}
        tone="neutral"
        caption={String(index)}
        pointers={pointers}
        testId={`string-char-${index}`}
        className="min-h-7 min-w-8 px-1.5 py-0.5"
      >
        <span title={isContinuation ? "second half of the previous character" : JSON.stringify(char)} className={cn("font-mono text-[13px]", isContinuation ? "text-muted-foreground" : PRIMITIVE_TEXT.string)}>
          {VISIBLE_CHARS[char] ?? char}
        </span>
      </ValueCell>
      {covering.map((range) => (
        <RangeUnderline key={`${range.start.name}:${range.end.name}`} range={range} index={index} />
      ))}
    </div>
  );
}

/** Pixels the chip stack above the busiest cell needs (0 when no cell has a pointer). */
function markSpace(perCell: readonly (readonly Pointer[])[]): number {
  const stacked = Math.max(0, ...perCell.map((pointers) => Math.min(pointers.length, VIZ_LIMITS.maxPointerTags + 1)));
  return stacked === 0 ? 0 : stacked * MARK_ROW_PX + MARK_CARET_PX;
}

interface StringRendererProps {
  frameId: number;
  name: string;
  value: string;
}

/**
 * A string variable as one small cell per character, with its index. Pointer rings and name chips come from the
 * string's own pointer host (strings have no object id); out-of-range pointers are listed after the last cell,
 * paired window pointers draw a tinted underline.
 */
export function StringRenderer({ frameId, name, value }: StringRendererProps) {
  const { pointers } = useViz();
  const host = stringHost(frameId, name);
  const cellCount = Math.min(value.length, MAX_STRING_CELLS);
  const perCell = Array.from({ length: cellCount }, (_, index) => pointers.at(host, String(index)));
  const ranges = pointers.ranges(host);
  const trailing = [...pointersPastCells(pointers, host, cellCount), ...pointers.outOfRange(host)];
  const space = markSpace(perCell);
  const hiddenCount = value.length - cellCount;
  return (
    <div
      data-testid="renderer-string"
      role="group"
      aria-label={`String of ${value.length} characters`}
      style={space > 0 ? { paddingTop: space, rowGap: space } : undefined}
      className="flex flex-wrap items-start gap-x-1.5 gap-y-1.5"
    >
      {perCell.map((cellPointers, index) => {
        const { text, isContinuation } = cellText(value, index);
        return <StringChar key={index} char={text} isContinuation={isContinuation} index={index} pointers={cellPointers} ranges={ranges} />;
      })}
      {value.length === 0 ? <EmptyChip label="empty string" /> : null}
      {hiddenCount > 0 ? (
        <span className={MORE_CHIP_CLASS} title={`${hiddenCount} more characters not shown`}>
          +{hiddenCount} more
        </span>
      ) : null}
      {trailing.map((pointer) => (
        <PointerTag key={`${pointer.frameId}:${pointer.name}:${pointer.target.cellKey}`} pointer={pointer} hasValue className="self-center" />
      ))}
    </div>
  );
}
