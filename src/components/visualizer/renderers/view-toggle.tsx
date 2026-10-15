"use client";

import type { ViewMode } from "@/lib/viz/overlay-types";
import { cn } from "@/lib/utils";
import { useViz } from "./viz-context";

const OPTIONS: readonly { mode: ViewMode; label: string }[] = [
  { mode: "array", label: "Cells" },
  { mode: "bars", label: "Bars" },
];

interface ViewToggleProps {
  /** The renderer path the choice is stored under (`viewModeOf(path)`). */
  path: string;
  /** The view currently drawn. */
  mode: ViewMode;
}

/** Compact two-button segmented control: show an array as cells or as bars. */
export function ViewToggle({ path, mode }: ViewToggleProps) {
  const { setViewMode } = useViz();
  return (
    <div role="group" aria-label="Array view" className="inline-flex shrink-0 rounded-md border border-border bg-muted/40 p-0.5 font-mono text-[11px]">
      {OPTIONS.map((option) => {
        const isPressed = option.mode === mode;
        return (
          <button
            key={option.mode}
            type="button"
            data-testid={`view-toggle-${option.mode}`}
            aria-pressed={isPressed}
            onClick={() => {
              if (!isPressed) setViewMode(path, option.mode);
            }}
            className={cn(
              "min-h-8 min-w-9 cursor-pointer rounded px-2 py-0.5 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 max-sm:min-h-11 max-sm:min-w-11",
              isPressed ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
