import { createElement } from "react";
import { describe, expect, it } from "vitest";
import type { SObject, Trace, TraceFrame } from "@/lib/tracer/types";
import { frame, nul, num, obj, ref, step, table } from "@/lib/viz/test-helpers";
import { LinkedListRenderer, listCaption } from "./linked-list-renderer";
import { renderWithViz } from "./render-test-utils";

const render = (objects: SObject[], frames: TraceFrame[], path: string): string => {
  const trace: Trace = { caseIndex: 0, steps: [step(0, frames, table(...objects))], isTruncated: false };
  return renderWithViz(trace, 0, createElement(LinkedListRenderer, { object: objects[0], path, depth: 0, ancestors: [] }));
};

const DOUBLY = [
  obj(1, [["val", num(1)], ["prev", nul], ["next", ref(2)]]),
  obj(2, [["val", num(2)], ["prev", ref(1)], ["next", nul]]),
];
const SINGLY = [obj(1, [["val", num(1)], ["next", ref(2)]]), obj(2, [["val", num(2)], ["next", nul]])];

describe("listCaption", () => {
  it("names the variable the list hangs from", () => {
    expect(listCaption("fn/tail")).toBe("tail");
    expect(listCaption("this")).toBe("this");
    expect(listCaption("list/head")).toBe("head");
  });

  it("falls back to head for array elements", () => {
    expect(listCaption("fn/lists/2")).toBe("head");
  });
});

describe("LinkedListRenderer", () => {
  it("captions the first node with its variable name, not HEAD", () => {
    const html = render(DOUBLY, [frame(1, [["tail", ref(1)]])], "fn/tail");
    expect(html).toContain(">tail<");
    expect(html).not.toContain(">head<");
  });

  it("draws a two-way link where prev points back, a one-way arrow otherwise", () => {
    const frames = [frame(1, [["head", ref(1)]])];
    expect(render(DOUBLY, frames, "fn/head")).toContain("lucide-arrow-left-right");
    expect(render(SINGLY, frames, "fn/head")).not.toContain("lucide-arrow-left-right");
  });
});
