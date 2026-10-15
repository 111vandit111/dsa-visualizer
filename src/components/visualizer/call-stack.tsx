"use client";

import { AnimatePresence, motion } from "framer-motion";
import { spring } from "@/lib/motion";
import type { TraceFrame } from "@/lib/tracer/types";
import { cn } from "@/lib/utils";

/** Deeper stacks show only the innermost frames. */
const MAX_VISIBLE_FRAMES = 8;

/**
 * Frames as stacked chips, innermost on top; chips slide in on call and out on return.
 * Rows do not use `layout` animation: they would glide from their old spot over the panels below, which jump at once.
 */
export function CallStack({ frames }: { frames: readonly TraceFrame[] }) {
  const innermostFirst = [...frames].reverse();
  const visible = innermostFirst.slice(0, MAX_VISIBLE_FRAMES);
  const hiddenCount = innermostFirst.length - visible.length;
  return (
    <section data-testid="call-stack" aria-label="Call stack" className="space-y-2">
      <p className="micro-label">Call stack · {frames.length}</p>
      <ol className="flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {visible.map((frame, index) => (
            <motion.li
              key={frame.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring.snappy}
              aria-current={index === 0 ? "true" : undefined}
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg border px-3 py-1.5 font-mono text-[13px]",
                index === 0 ? "border-primary/50 bg-primary/10 text-primary glow-primary" : "border-border bg-muted/40 text-muted-foreground",
              )}
            >
              <span className="min-w-0 truncate">{frame.name}</span>
              <span className="shrink-0 text-xs opacity-80">:{frame.line}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
      {hiddenCount > 0 ? <p className="font-mono text-xs text-muted-foreground">+{hiddenCount} outer frames</p> : null}
    </section>
  );
}
