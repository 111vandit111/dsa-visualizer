interface Insertion {
  position: number;
  text: string;
  order: number;
}

const LINE_BREAK = /[\n\r\u2028\u2029]/;

/**
 * Collects text insertions against the original source and applies them in one pass.
 * Code is only ever inserted (never removed or re-printed), and inserted text never contains
 * a line break, so every original line keeps its line number in the output.
 * Insertions at the same position keep the order in which they were added.
 */
export class Splicer {
  private readonly insertions: Insertion[] = [];

  insert(position: number, text: string): void {
    if (LINE_BREAK.test(text)) throw new Error("Instrumentation text must not contain line breaks");
    this.insertions.push({ position, text, order: this.insertions.length });
  }

  apply(source: string): string {
    const sorted = [...this.insertions].sort((a, b) => a.position - b.position || a.order - b.order);
    const parts: string[] = [];
    let cursor = 0;
    for (const { position, text } of sorted) {
      parts.push(source.slice(cursor, position), text);
      cursor = position;
    }
    parts.push(source.slice(cursor));
    return parts.join("");
  }
}
