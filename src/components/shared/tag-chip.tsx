import { cn } from "@/lib/utils";

interface TagChipProps {
  tag: string;
  isActive?: boolean;
  onClick?: () => void;
}

const CHIP_BASE =
  "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs transition-colors";

export function TagChip({ tag, isActive = false, onClick }: TagChipProps) {
  const chipClass = cn(
    CHIP_BASE,
    isActive
      ? "border-primary/50 bg-primary/10 text-primary"
      : "border-border bg-muted text-muted-foreground",
  );

  if (!onClick) {
    return <span className={chipClass}>{tag}</span>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        chipClass,
        "cursor-pointer outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 max-sm:min-h-11 max-sm:min-w-11 max-sm:justify-center max-sm:px-3",
      )}
    >
      {tag}
    </button>
  );
}
