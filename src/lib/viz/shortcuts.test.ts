import { describe, expect, it } from "vitest";
import { actionForKey } from "./shortcuts";

describe("actionForKey", () => {
  it("maps the documented keys", () => {
    expect(actionForKey(" ", "other")).toBe("toggle");
    expect(actionForKey("ArrowLeft", "other")).toBe("prev");
    expect(actionForKey("ArrowRight", "other")).toBe("next");
    expect(actionForKey("Home", "other")).toBe("first");
    expect(actionForKey("End", "other")).toBe("last");
    expect(actionForKey("ArrowUp", "other")).toBe("faster");
    expect(actionForKey("ArrowDown", "other")).toBe("slower");
    expect(actionForKey("x", "other")).toBeNull();
  });

  it("never fires inside inputs and editors", () => {
    expect(actionForKey(" ", "editable")).toBeNull();
    expect(actionForKey("ArrowLeft", "editable")).toBeNull();
  });

  it("leaves a focused control's own keys alone", () => {
    expect(actionForKey("ArrowLeft", "slider")).toBeNull();
    expect(actionForKey(" ", "slider")).toBe("toggle");
    expect(actionForKey(" ", "button")).toBeNull();
    expect(actionForKey("ArrowRight", "button")).toBe("next");
    expect(actionForKey("ArrowRight", "group")).toBeNull();
    expect(actionForKey("Home", "group")).toBe("first");
  });

  it("ignores key presses with modifiers", () => {
    expect(actionForKey("ArrowLeft", "other", true)).toBeNull();
  });
});
