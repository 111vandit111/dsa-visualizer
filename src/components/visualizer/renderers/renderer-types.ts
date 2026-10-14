import type { SObject } from "@/lib/tracer/types";

export interface RendererProps {
  object: SObject;
  /** Stable identity of this spot in the variables tree (keeps expand/collapse across steps). */
  path: string;
  /** Number of containers above this one. */
  depth: number;
  /** Ids of the containers above this one: a ref back to one of them is a cycle. */
  ancestors: readonly number[];
}
