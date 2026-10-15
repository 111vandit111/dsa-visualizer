import type { SValue } from "@/lib/tracer/types";

export const POINTER_PALETTE_SIZE = 8;                       // slot s uses CSS var --ptr-{(s % 8) + 1}
export const NULL_HOST = "null";
export const objectHost = (objectId: number): string => `o${objectId}`;
export const stringHost = (frameId: number, name: string): string => `s${frameId}:${name}`;

/** host = objectHost(id) | stringHost(frameId, varName) | NULL_HOST. cellKey = diff.ts cell key; null = the whole object/node. */
export interface PointerTarget { host: string; cellKey: string | null }

export type PointerKind = "index" | "ref";
export interface Pointer {
  name: string;               // variable name: "i", "left", "curr"
  slot: number;               // stable per name over the whole trace (first appearance order); colour = slot % POINTER_PALETTE_SIZE
  kind: PointerKind;          // index: number/string key into an array|string|map; ref: reference to a node/element object
  frameId: number;
  isActive: boolean;          // variable lives in the innermost frame (caller-frame pointers render dimmed)
  target: PointerTarget;
  value: SValue;
  isOutOfRange: boolean;      // index pointer outside [0, length): still alive, listed in outOfRange() not at()
}
export interface PointerRange { host: string; from: number; to: number; start: Pointer; end: Pointer }   // paired window pointers (left/right...), from <= to
export interface StepPointers {
  all: readonly Pointer[];                                          // legend order: slot asc, active frame first
  at(host: string, cellKey: string | null): readonly Pointer[];     // in-range pointers on that cell (cellKey null: ref pointers on the object)
  outOfRange(host: string): readonly Pointer[];
  ranges(host: string): readonly PointerRange[];
  nulls: readonly Pointer[];                                        // ref-kind names whose value is currently null (target.host NULL_HOST)
}
export interface PointerModel {
  slotCount: number;
  slotOf(name: string): number | undefined;
  indexVarNames: ReadonlySet<string>;                               // names resolved as index pointers anywhere in the trace
  at(stepIndex: number): StepPointers;
}
export const EMPTY_STEP_POINTERS: StepPointers = { all: [], at: () => [], outOfRange: () => [], ranges: () => [], nulls: [] };

export type PathSource = "call-stack" | "array" | "collection";
/** points[k] = values naming the k-th stop: [nodeValue] (graph/tree node: ref or primitive id) or [row, col] (grid cell). Outermost/oldest first. */
export interface PathSequence { name: string; slot: number; source: PathSource; isActive: boolean; points: readonly (readonly SValue[])[] }
export interface ReachSet { name: string; slot: number; points: readonly (readonly SValue[])[] }   // visited/seen-like sets, boolean arrays
export interface StepPaths { sequences: readonly PathSequence[]; reached: readonly ReachSet[] }
export interface PathModel { slotCount: number; at(stepIndex: number): StepPaths }
export const EMPTY_STEP_PATHS: StepPaths = { sequences: [], reached: [] };

export interface IndexUse { base: string; via: readonly string[] }  // base "nums" | "this.nums"; via = first identifier of each earlier bracket in a chain (dp[i][j] -> j: base "dp", via ["i"])
export type IndexEvidence = ReadonlyMap<string, readonly IndexUse[]>;   // variable name -> where it is used as an index

export type ViewMode = "array" | "bars";

export type GraphFormat = "adjacency-list" | "adjacency-matrix" | "edge-list" | "node-objects" | "keyed";
/** targets = every PointerTarget whose pointers light this node (renderer unions pointers.at(t.host, t.cellKey)). */
export interface GraphNode { key: string; label: string; targets: readonly PointerTarget[] }
export interface GraphEdge { key: string; from: number; to: number; weight: string | null }   // from/to index into nodes
export interface GraphModel {
  format: GraphFormat; nodes: GraphNode[]; edges: GraphEdge[]; isDirected: boolean; isTruncated: boolean;
  nodeIndexOfValue(value: SValue): number | null;                   // path/reach point -> node index (number id, ref id, or map key)
}
export interface GraphLayout { positions: { x: number; y: number }[]; width: number; height: number }   // node-spacing units, min node distance >= 1, left/top edge 0
