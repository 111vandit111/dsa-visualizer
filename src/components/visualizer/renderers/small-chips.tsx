import { cn } from "@/lib/utils";

const CHIP_CLASS = "inline-flex min-h-9 items-center rounded-md border border-dashed border-border px-2.5 font-mono text-xs text-muted-foreground";

/** "+n more": the container holds more items than the trace recorded. */
export function MoreChip({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span className={cn(CHIP_CLASS, className)} title={`${count} more not recorded`}>
      +{count} more
    </span>
  );
}

export function EmptyChip({ label, className }: { label: string; className?: string }) {
  return <span className={cn(CHIP_CLASS, className)}>{label}</span>;
}
