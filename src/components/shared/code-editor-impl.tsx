"use client";

import { useMemo } from "react";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { dsaEditorTheme } from "@/lib/codemirror-theme";
import { cn } from "@/lib/utils";

export interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language: "javascript" | "json";
  isReadOnly?: boolean;
  height?: string;
  ariaLabel: string;
}

export default function CodeEditorImpl({
  value,
  onChange,
  language,
  isReadOnly = false,
  height = "320px",
  ariaLabel,
}: CodeEditorProps) {
  const extensions = useMemo(
    () => [
      language === "json" ? json() : javascript(),
      EditorView.contentAttributes.of({ "aria-label": ariaLabel }),
    ],
    [language, ariaLabel],
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card surface-hairline",
        "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30",
      )}
    >
      <CodeMirror
        value={value}
        onChange={onChange}
        height={height}
        theme={dsaEditorTheme}
        extensions={extensions}
        editable={!isReadOnly}
        readOnly={isReadOnly}
        basicSetup={{ foldGutter: false, highlightActiveLine: !isReadOnly }}
      />
    </div>
  );
}
