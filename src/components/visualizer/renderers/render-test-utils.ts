import { createElement, type FunctionComponent, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Trace, VisualHints } from "@/lib/tracer/types";
import { buildPathModel } from "@/lib/viz/paths";
import { buildPointerModel } from "@/lib/viz/pointers";
import { VizProvider } from "./viz-context";

interface RenderOptions {
  hints?: VisualHints;
  /** Solution source for pointer detection (index evidence); empty by default. */
  code?: string;
}

/** `createElement` for a component whose `children` prop is required (the lint rule forbids passing it as a prop). */
export function elementWith<P extends { children: ReactNode }>(
  type: FunctionComponent<P>,
  props: Omit<P, "children">,
  children: ReactNode,
): ReactElement {
  return createElement(type as FunctionComponent<Omit<P, "children">>, props, children);
}

/** Static markup of `node` inside a `VizProvider` showing `stepIndex` of `trace`: for smoke tests of renderers. */
export function renderWithViz(trace: Trace, stepIndex: number, node: ReactNode, options: RenderOptions = {}): string {
  const step = trace.steps[stepIndex];
  if (!step) throw new Error(`Trace has no step ${stepIndex}`);
  const pointerModel = buildPointerModel(trace, options.code ?? "");
  const pathModel = buildPathModel(trace, pointerModel.slotCount, pointerModel.indexVarNames);
  return renderToStaticMarkup(
    elementWith(VizProvider, { step, previousStep: trace.steps[stepIndex - 1], hints: options.hints ?? {}, pointerModel, pathModel }, node),
  );
}
