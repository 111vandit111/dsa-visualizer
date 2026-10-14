import { EditorState, RangeSet, StateEffect, StateField, type Extension } from "@codemirror/state";
import { Decoration, EditorView, GutterMarker, gutterLineClass, layer, type LayerMarker } from "@codemirror/view";

export interface Playhead {
  /** 1-based line being executed (null before the first step). */
  line: number | null;
  /** 1-based call-site lines of the callers, outermost first. */
  callerLines: readonly number[];
}

const NO_PLAYHEAD: Playhead = { line: null, callerLines: [] };
const SCROLL_MARGIN_PX = 64;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const setPlayhead = StateEffect.define<Playhead>();

const playheadField = StateField.define<Playhead>({
  create: () => NO_PLAYHEAD,
  update(value, transaction) {
    for (const effect of transaction.effects) if (effect.is(setPlayhead)) return effect.value;
    return value;
  },
});

const ACTIVE_LINE = Decoration.line({ class: "cm-step-active", attributes: { "data-testid": "active-line" } });
const CALLER_LINE = Decoration.line({ class: "cm-caller-line" });

function isValidLine(state: EditorState, line: number | null): line is number {
  return line !== null && line >= 1 && line <= state.doc.lines;
}

const lineDecorations = EditorView.decorations.compute([playheadField], (state) => {
  const { line, callerLines } = state.field(playheadField);
  const starts = new Map<number, Decoration>();
  for (const callerLine of callerLines) {
    if (isValidLine(state, callerLine)) starts.set(state.doc.line(callerLine).from, CALLER_LINE);
  }
  if (isValidLine(state, line)) starts.set(state.doc.line(line).from, ACTIVE_LINE);
  return Decoration.set([...starts].map(([from, decoration]) => decoration.range(from)), true);
});

class PlayheadGutterMarker extends GutterMarker {
  elementClass = "cm-step-gutter";
}
const GUTTER_MARKER = new PlayheadGutterMarker();

const gutterMarking = gutterLineClass.compute([playheadField], (state) => {
  const { line } = state.field(playheadField);
  return isValidLine(state, line) ? RangeSet.of([GUTTER_MARKER.range(state.doc.line(line).from)]) : RangeSet.empty;
});

interface BarRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Full-width glow bar behind the executing line. The element is reused between steps so CSS transitions glide it. */
class PlayheadBar implements LayerMarker {
  constructor(private readonly rect: BarRect) {}

  eq(other: LayerMarker): boolean {
    return other instanceof PlayheadBar && JSON.stringify(other.rect) === JSON.stringify(this.rect);
  }

  draw(): HTMLElement {
    const element = document.createElement("div");
    element.className = "cm-step-bar";
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) element.style.transition = "none";
    this.place(element);
    return element;
  }

  update(element: HTMLElement, previous: LayerMarker): boolean {
    this.place(element);
    const hasMoved = previous instanceof PlayheadBar && previous.rect.top !== this.rect.top;
    if (hasMoved && !window.matchMedia(REDUCED_MOTION_QUERY).matches) this.pulse(element);
    return true;
  }

  private place(element: HTMLElement): void {
    element.style.top = `${this.rect.top}px`;
    element.style.left = `${this.rect.left}px`;
    element.style.width = `${this.rect.width}px`;
    element.style.height = `${this.rect.height}px`;
  }

  private pulse(element: HTMLElement): void {
    element.classList.remove("cm-step-bar-pulse");
    void element.offsetWidth;
    element.classList.add("cm-step-bar-pulse");
  }
}

function measureBar(view: EditorView): readonly LayerMarker[] {
  const { line } = view.state.field(playheadField);
  if (!isValidLine(view.state, line)) return [];
  const block = view.lineBlockAt(view.state.doc.line(line).from);
  const scroller = view.scrollDOM.getBoundingClientRect();
  const content = view.contentDOM.getBoundingClientRect();
  return [
    new PlayheadBar({
      top: view.documentTop + block.top - scroller.top + view.scrollDOM.scrollTop,
      left: content.left - scroller.left + view.scrollDOM.scrollLeft,
      width: content.width,
      height: block.height,
    }),
  ];
}

const barLayer = layer({
  above: false,
  class: "cm-step-layer",
  markers: measureBar,
  update: (update) =>
    update.docChanged ||
    update.viewportChanged ||
    update.geometryChanged ||
    update.transactions.some((transaction) => transaction.effects.some((effect) => effect.is(setPlayhead))),
});

const PRIMARY_GLOW = "color-mix(in oklch, var(--primary) 60%, transparent)";

const playheadTheme = EditorView.theme({
  ".cm-step-bar": {
    position: "absolute",
    pointerEvents: "none",
    borderRadius: "4px",
    background: "linear-gradient(90deg, color-mix(in oklch, var(--primary) 18%, transparent), color-mix(in oklch, var(--primary) 4%, transparent))",
    boxShadow: "0 0 24px -6px var(--primary)",
    transition: "top 240ms cubic-bezier(0.2, 0.9, 0.3, 1), height 240ms ease-out",
  },
  ".cm-step-bar-pulse": { animation: "glow-pulse 600ms ease-out 1" },
  ".cm-step-active": {
    boxShadow: "inset 3px 0 0 var(--primary)",
    textShadow: `0 0 8px ${PRIMARY_GLOW}`,
  },
  ".cm-caller-line": {
    boxShadow: "inset 2px 0 0 color-mix(in oklch, var(--viz-violet) 70%, transparent)",
    backgroundColor: "color-mix(in oklch, var(--viz-violet) 7%, transparent)",
  },
  ".cm-gutterElement.cm-step-gutter": {
    color: "var(--primary)",
    textShadow: `0 0 8px ${PRIMARY_GLOW}`,
    boxShadow: "inset -2px 0 0 var(--primary)",
    backgroundColor: "color-mix(in oklch, var(--primary) 10%, transparent)",
  },
});

export const playheadExtension: Extension = [playheadField, lineDecorations, gutterMarking, barLayer, playheadTheme];

/** Moves the highlighted line and scrolls it into view. */
export function showPlayhead(view: EditorView, playhead: Playhead): void {
  const effects: StateEffect<unknown>[] = [setPlayhead.of(playhead)];
  if (isValidLine(view.state, playhead.line)) {
    effects.push(EditorView.scrollIntoView(view.state.doc.line(playhead.line).from, { y: "nearest", yMargin: SCROLL_MARGIN_PX }));
  }
  view.dispatch({ effects });
}
