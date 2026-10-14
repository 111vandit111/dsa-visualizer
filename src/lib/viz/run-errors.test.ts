import { describe, expect, it } from "vitest";
import { describeRunError } from "./run-errors";

describe("describeRunError", () => {
  it("names the kind and appends the line when known", () => {
    expect(describeRunError({ kind: "runtime", message: "x is not defined", line: 4, column: null })).toEqual({
      title: "Runtime error",
      detail: "x is not defined (line 4)",
    });
  });

  it("omits the line when there is none", () => {
    expect(describeRunError({ kind: "timeout", message: "too slow", line: null, column: null }).detail).toBe("too slow");
  });
});
