import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

const KEYWORD_GLOW = "0 0 8px color-mix(in oklch, var(--primary) 45%, transparent)";

const editorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "var(--card)",
      color: "var(--foreground)",
      fontSize: "13px",
    },
    ".cm-content": {
      fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
      caretColor: "var(--primary)",
      padding: "8px 0",
    },
    ".cm-scroller": { fontFamily: "inherit", lineHeight: "1.65" },
    "&.cm-focused": { outline: "none" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--primary)" },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection":
      { backgroundColor: "color-mix(in oklch, var(--primary) 28%, transparent)" },
    ".cm-gutters": {
      backgroundColor: "var(--card)",
      color: "var(--muted-foreground)",
      border: "none",
      borderRight: "1px solid var(--border)",
    },
    ".cm-activeLine": {
      backgroundColor: "color-mix(in oklch, var(--primary) 6%, transparent)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
      color: "var(--primary)",
    },
    ".cm-matchingBracket": {
      backgroundColor: "color-mix(in oklch, var(--viz-cyan) 25%, transparent)",
      outline: "none",
    },
    ".cm-tooltip": {
      backgroundColor: "var(--popover)",
      border: "1px solid var(--border)",
      color: "var(--popover-foreground)",
    },
  },
  { dark: true },
);

const neonHighlight = HighlightStyle.define([
  {
    tag: [tags.keyword, tags.controlKeyword, tags.moduleKeyword],
    color: "var(--viz-lime)",
    textShadow: KEYWORD_GLOW,
  },
  { tag: [tags.string, tags.special(tags.string)], color: "var(--viz-amber)" },
  { tag: [tags.number, tags.bool, tags.null], color: "var(--viz-cyan)" },
  {
    tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
    color: "var(--viz-violet)",
  },
  { tag: [tags.className, tags.typeName], color: "var(--viz-cyan)" },
  { tag: [tags.propertyName, tags.definition(tags.propertyName)], color: "var(--foreground)" },
  { tag: [tags.operator, tags.punctuation], color: "var(--muted-foreground)" },
  { tag: tags.regexp, color: "var(--viz-rose)" },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: "var(--muted-foreground)", fontStyle: "italic" },
]);

export const dsaEditorTheme: Extension = [editorTheme, syntaxHighlighting(neonHighlight)];
