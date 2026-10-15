"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { VIZ_LIMITS } from "@/lib/viz/constants";
import { GraphCanvas } from "./graph-canvas";
import { buildGraphView, graphModelFor, structureFor, type LegendItem } from "./graph-overlay";
import { pointerStyle } from "./pointer-styles";
import type { RendererProps } from "./renderer-types";
import { EmptyChip } from "./small-chips";
import { useViz } from "./viz-context";

const LEGEND_CHIP_CLASS = "ptr-chip inline-flex items-center gap-1 rounded px-1 font-mono text-[10px] leading-[14px] whitespace-nowrap";

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? "" : "s"}`;

function legendTitle(item: LegendItem): string {
  const what = item.kind === "path" ? "path" : "visited";
  return `${item.name} (${what}${item.isActive ? "" : ", caller frame"})`;
}

/** One chip per path / visited set drawn on the graph, in the colour of its strokes and rings. */
function PathLegend({ items }: { items: readonly LegendItem[] }) {
  return (
    <ul data-testid="graph-path-legend" aria-label="Paths on the graph" className="flex flex-wrap items-center gap-1.5">
      {items.map((item) => (
        <li
          key={`${item.kind}:${item.slot}`}
          data-testid="graph-path-legend-item"
          data-path={item.name}
          data-slot={item.slot}
          data-kind={item.kind}
          data-active={item.isActive}
          title={legendTitle(item)}
          style={pointerStyle(item.slot)}
          className={cn(LEGEND_CHIP_CLASS, !item.isActive && "ptr-chip-dim")}
        >
          <span aria-hidden="true" className={item.kind === "path" ? "h-0.5 w-3 rounded-full bg-(--ptr)" : "size-2 rounded-full border border-(--ptr) bg-(--ptr)/30"} />
          {item.name}
        </li>
      ))}
    </ul>
  );
}

/**
 * A graph as a node-link diagram (adjacency list/matrix, edge list, node objects with neighbours, or a map of
 * neighbours). Live pointers light their node, paths are coloured strokes and rings, visited sets tint nodes.
 */
export function GraphRenderer({ object }: RendererProps) {
  const { objects, diff, pointers, paths, nameOf, stepIndex } = useViz();
  const nameHint = nameOf(object.id) ?? undefined;
  const model = useMemo(() => graphModelFor(objects, object.id, nameHint), [objects, object.id, nameHint]);
  const structure = useMemo(() => (model ? structureFor(model) : null), [model]);
  const view = useMemo(
    () => (model && structure ? buildGraphView({ model, layout: structure.layout, objects, diff, pointers, paths }) : null),
    [model, structure, objects, diff, pointers, paths],
  );

  if (!model || !structure || !view) {
    return (
      <div data-testid="renderer-graph">
        <EmptyChip label="empty graph" />
      </div>
    );
  }
  const ariaLabel = `Graph: ${plural(model.nodes.length, "node")}, ${plural(model.edges.length, "edge")}`;
  return (
    <div data-testid="renderer-graph" data-format={model.format} data-directed={model.isDirected} className="space-y-1.5">
      <GraphCanvas
        nodes={view.nodes}
        edges={view.edges}
        structure={structure}
        isDirected={model.isDirected}
        stepIndex={stepIndex}
        ariaLabel={ariaLabel}
      />
      {view.legend.length > 0 ? <PathLegend items={view.legend} /> : null}
      {model.isTruncated ? (
        <EmptyChip label={`large graph: showing up to ${VIZ_LIMITS.maxGraphNodes} nodes and ${VIZ_LIMITS.maxGraphEdges} edges`} className="h-auto w-fit whitespace-normal" />
      ) : null}
    </div>
  );
}
