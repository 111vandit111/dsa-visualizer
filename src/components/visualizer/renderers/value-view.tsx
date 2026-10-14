"use client";

import { ChevronRightIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { SValue } from "@/lib/tracer/types";
import { VIZ_LIMITS } from "@/lib/viz/constants";
import { containerLabel, summarizeValue } from "@/lib/viz/format";
import type { RenderType } from "@/lib/viz/types";
import { cn } from "@/lib/utils";
import { ArrayRenderer } from "./array-renderer";
import { GridRenderer } from "./grid-renderer";
import { HeapRenderer } from "./heap-renderer";
import { LinkedListRenderer } from "./linked-list-renderer";
import { MapRenderer } from "./map-renderer";
import { PrimitiveChip } from "./primitive-chip";
import type { RendererProps } from "./renderer-types";
import { SetRenderer } from "./set-renderer";
import { TreeRenderer } from "./tree-renderer";
import { useViz } from "./viz-context";

const NO_ANCESTORS: readonly number[] = [];
const COLLAPSE_SPRING = { duration: 0.2, ease: "easeOut" } as const;
const MUTED_CHIP = "inline-block max-w-[28ch] truncate align-middle font-mono text-xs text-muted-foreground";

export interface ValueViewProps {
  value: SValue;
  path: string;
  depth?: number;
  ancestors?: readonly number[];
}

function RendererSwitch({ type, ...props }: RendererProps & { type: RenderType }) {
  switch (type) {
    case "array":
      return <ArrayRenderer {...props} />;
    case "grid":
      return <GridRenderer {...props} />;
    case "set":
      return <SetRenderer {...props} />;
    case "map":
      return <MapRenderer {...props} />;
    case "heap":
      return <HeapRenderer {...props} />;
    case "linkedlist":
      return <LinkedListRenderer {...props} />;
    case "tree":
      return <TreeRenderer {...props} />;
  }
}

function NestedValue({ type, ...props }: RendererProps & { type: RenderType }) {
  const { objects, isExpanded, setExpanded } = useViz();
  const isOpen = isExpanded(props.path, props.depth < VIZ_LIMITS.autoExpandDepth);
  const summary = summarizeValue(objects, { k: "ref", id: props.object.id });
  return (
    <div className="min-w-0">
      <button
        type="button"
        aria-expanded={isOpen}
        title={summary}
        onClick={() => setExpanded(props.path, !isOpen)}
        className="flex max-w-full cursor-pointer items-center gap-1 rounded-md py-0.5 pr-1 text-left outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 max-sm:min-h-11"
      >
        <ChevronRightIcon className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")} aria-hidden="true" />
        <span className={cn(MUTED_CHIP, isOpen && "micro-label")}>{isOpen ? containerLabel(props.object) : summary}</span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={COLLAPSE_SPRING}
            className="overflow-hidden"
          >
            <div className="ml-1.5 border-l border-border pt-1 pl-2.5">
              <RendererSwitch type={type} {...props} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ObjectView({ id, path, depth, ancestors }: { id: number; path: string; depth: number; ancestors: readonly number[] }) {
  const { objects, typeOf } = useViz();
  const object = objects[id];
  const type = typeOf(id);
  if (!object || !type) return <span className={MUTED_CHIP}>ref #{id}</span>;
  if (ancestors.includes(id)) return <span className={MUTED_CHIP} title="This object contains itself">↻ ref #{id}</span>;
  const props: RendererProps = { object, path, depth, ancestors: [...ancestors, id] };
  if (depth === 0) return <RendererSwitch type={type} {...props} />;
  if (depth > VIZ_LIMITS.maxNestDepth) return <span className={MUTED_CHIP}>{summarizeValue(objects, { k: "ref", id })}</span>;
  return <NestedValue type={type} {...props} />;
}

/** Any value: primitives as coloured chips, containers through the renderer chosen by detection/hints. */
export function ValueView({ value, path, depth = 0, ancestors = NO_ANCESTORS }: ValueViewProps) {
  if (value.k !== "ref") return <PrimitiveChip value={value} />;
  return <ObjectView id={value.id} path={path} depth={depth} ancestors={ancestors} />;
}

/** One-line form for tight spots (grid cells, tree nodes, map keys): containers are summarised, never expanded. */
export function InlineValue({ value }: { value: SValue }) {
  const { objects } = useViz();
  if (value.k !== "ref") return <PrimitiveChip value={value} />;
  const summary = summarizeValue(objects, value);
  return (
    <span className={MUTED_CHIP} title={summary}>
      {summary}
    </span>
  );
}
