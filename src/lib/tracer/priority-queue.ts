export type Comparator<T> = (a: T, b: T) => number;

function defaultCompare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  return (a as number) < (b as number) ? -1 : 1;
}

export class PriorityQueue<T = unknown> {
  private readonly heap: T[] = [];
  private readonly compare: Comparator<T>;

  constructor(compare?: Comparator<T>) {
    this.compare = compare ?? (defaultCompare as Comparator<T>);
  }

  enqueue(value: T): this {
    this.heap.push(value);
    this.siftUp(this.heap.length - 1);
    return this;
  }

  dequeue(): T | null {
    if (this.heap.length === 0) return null;
    const top = this.heap[0];
    const last = this.heap.pop() as T;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.siftDown(0);
    }
    return top;
  }

  front(): T | null {
    return this.heap.length === 0 ? null : this.heap[0];
  }

  back(): T | null {
    if (this.heap.length === 0) return null;
    let lowest = this.heap[this.heap.length - 1];
    for (let i = Math.floor(this.heap.length / 2); i < this.heap.length - 1; i++) {
      if (this.compare(lowest, this.heap[i]) < 0) lowest = this.heap[i];
    }
    return lowest;
  }

  size(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  toArray(): T[] {
    return [...this.heap].sort(this.compare);
  }

  clear(): void {
    this.heap.length = 0;
  }

  heapItems(): readonly T[] {
    return this.heap;
  }

  private siftUp(start: number): void {
    let child = start;
    while (child > 0) {
      const parent = (child - 1) >> 1;
      if (this.compare(this.heap[child], this.heap[parent]) >= 0) return;
      this.swap(child, parent);
      child = parent;
    }
  }

  private siftDown(start: number): void {
    const length = this.heap.length;
    let parent = start;
    for (;;) {
      const left = parent * 2 + 1;
      const right = left + 1;
      let first = parent;
      if (left < length && this.compare(this.heap[left], this.heap[first]) < 0) first = left;
      if (right < length && this.compare(this.heap[right], this.heap[first]) < 0) first = right;
      if (first === parent) return;
      this.swap(parent, first);
      parent = first;
    }
  }

  private swap(i: number, j: number): void {
    const tmp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = tmp;
  }
}
