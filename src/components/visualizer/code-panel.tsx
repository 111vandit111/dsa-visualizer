"use client";

import { useEffect, useRef } from "react";
import { javascript } from "@codemirror/lang-javascript";
import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { dsaEditorTheme } from "@/lib/codemirror-theme";
import type { StepKind } from "@/lib/tracer/types";
import { cn } from "@/lib/utils";
import { playheadExtension, showPlayhead } from "./playhead-extension";

interface CodePanelProps {
  code: string;
  /** Line executing now (null when there is no trace). */
  line: number | null;
  callerLines: readonly number[];
  stepKind: StepKind | null;
  frameName: string | null;
}

const KIND_STYLES: Record<StepKind, string> = {
  "op-start": "border-primary/40 text-primary",
  "op-end": "border-primary/40 text-primary",
  call: "border-viz-violet/40 text-viz-violet",
  return: "border-viz-cyan/40 text-viz-cyan",
  loop: "border-viz-amber/40 text-viz-amber",
  step: "border-border text-muted-foreground",
  error: "border-destructive/50 text-destructive",
};

const KIND_LABELS: Record<StepKind, string> = {
  "op-start": "op start",
  "op-end": "op end",
  call: "call",
  return: "return",
  loop: "loop",
  step: "step",
  error: "error",
};

function createExtensions() {
  return [
    lineNumbers(),
    javascript(),
    dsaEditorTheme,
    EditorState.readOnly.of(true),
    EditorView.editable.of(false),
    EditorView.contentAttributes.of({ "aria-label": "Solution code", "aria-readonly": "true" }),
    playheadExtension,
  ];
}

function parseLines(key: string): number[] {
  return key === "" ? [] : key.split(",").map(Number);
}

/** Read-only solution code with a glowing playhead on the executing line and the callers' call sites marked. */
export function CodePanel({ code, line, callerLines, stepKind, frameName }: CodePanelProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const callerKey = callerLines.join(",");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const view = new EditorView({ parent: host, state: EditorState.create({ doc: code, extensions: createExtensions() }) });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [code]);

  useEffect(() => {
    const view = viewRef.current;
    if (view) showPlayhead(view, { line, callerLines: parseLines(callerKey) });
  }, [code, line, callerKey]);

  return (
    <section
      data-testid="code-panel"
      aria-label="Solution code"
      className="overflow-hidden rounded-xl border border-primary/20 bg-card glow-primary"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="micro-label">solution.js</span>
        <div className="flex min-w-0 items-center gap-2">
          {stepKind ? (
            <span className={cn("rounded-md border px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider", KIND_STYLES[stepKind])}>
              {KIND_LABELS[stepKind]}
            </span>
          ) : null}
          {frameName ? <span className="truncate font-mono text-xs text-muted-foreground">{frameName}</span> : null}
          {line === null ? null : <span className="font-mono text-xs text-primary text-glow">L{line}</span>}
        </div>
      </header>
      <div ref={hostRef} className="h-[min(52dvh,30rem)] [&_.cm-editor]:h-full" />
    </section>
  );
}
