import type { PrimitiveTone } from "@/lib/viz/format";
import type { CellStatus } from "@/lib/viz/types";

export type Tone = "lime" | "cyan" | "violet" | "amber" | "neutral";

export interface ToneStyle {
  border: string;
  surface: string;
  text: string;
  stroke: string;
  glow: string;
}

/** Full class strings (not built dynamically) so Tailwind can see them. */
export const TONE_STYLES: Record<Tone, ToneStyle> = {
  lime: { border: "border-primary/40", surface: "bg-primary/10", text: "text-primary", stroke: "stroke-primary/60", glow: "glow-primary" },
  cyan: { border: "border-viz-cyan/40", surface: "bg-viz-cyan/10", text: "text-viz-cyan", stroke: "stroke-viz-cyan/60", glow: "glow-cyan" },
  violet: { border: "border-viz-violet/40", surface: "bg-viz-violet/10", text: "text-viz-violet", stroke: "stroke-viz-violet/60", glow: "glow-violet" },
  amber: { border: "border-viz-amber/40", surface: "bg-viz-amber/10", text: "text-viz-amber", stroke: "stroke-viz-amber/60", glow: "glow-amber" },
  neutral: { border: "border-border", surface: "bg-muted/60", text: "text-foreground", stroke: "stroke-muted-foreground/50", glow: "" },
};

export const HALO_STYLES: Record<CellStatus, string> = {
  added: "border-primary/80 glow-primary",
  changed: "border-viz-amber/80 glow-amber",
};

export const PRIMITIVE_TEXT: Record<PrimitiveTone, string> = {
  number: "text-viz-cyan",
  string: "text-viz-amber",
  boolean: "text-viz-violet",
  muted: "text-muted-foreground",
  function: "text-muted-foreground italic",
};

/** Seconds a change halo takes to fade out. */
export const HALO_FADE_S = 0.6;
