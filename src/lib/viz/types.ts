import type { TraceStep, VisualHintType } from "@/lib/tracer/types";

export type RenderType = VisualHintType;
export type ObjectTable = TraceStep["objects"];
export type CellStatus = "added" | "changed";
