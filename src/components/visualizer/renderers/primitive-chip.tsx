import type { SPrimitive } from "@/lib/tracer/types";
import { formatPrimitive } from "@/lib/viz/format";
import { cn } from "@/lib/utils";
import { PRIMITIVE_TEXT } from "./tones";

function fullText(value: SPrimitive): string {
  switch (value.k) {
    case "string":
    case "bigint":
    case "symbol":
      return value.v;
    case "boolean":
    case "number":
      return String(value.v);
    default:
      return formatPrimitive(value).text;
  }
}

/** A primitive value in its type colour (numbers cyan, strings amber, booleans violet). */
export function PrimitiveChip({ value, className }: { value: SPrimitive; className?: string }) {
  const { text, tone } = formatPrimitive(value);
  return (
    <span
      title={fullText(value)}
      className={cn("inline-block max-w-[22ch] truncate align-middle font-mono text-[13px]", PRIMITIVE_TEXT[tone], className)}
    >
      {text}
    </span>
  );
}
