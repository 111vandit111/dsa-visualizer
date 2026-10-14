/** Code that cannot be traced: a parse error or a construct the tracer forbids (RunError kind "syntax"). */
export class TracerSyntaxError extends Error {
  readonly kind = "syntax";
  readonly line: number | null;
  /** 1-based. */
  readonly column: number | null;

  constructor(message: string, line: number | null, column: number | null) {
    super(message);
    this.name = "TracerSyntaxError";
    this.line = line;
    this.column = column;
  }
}
