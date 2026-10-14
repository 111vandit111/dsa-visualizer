import { describe, expect, it } from "vitest";
import { PriorityQueue } from "./priority-queue";

function seededNumbers(count: number, seed: number): number[] {
  let state = seed;
  return Array.from({ length: count }, () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state % 1000;
  });
}

function drain<T>(queue: PriorityQueue<T>): T[] {
  const out: T[] = [];
  while (!queue.isEmpty()) out.push(queue.dequeue() as T);
  return out;
}

describe("PriorityQueue", () => {
  it("dequeues in ascending order by default", () => {
    const values = seededNumbers(200, 7);
    const queue = new PriorityQueue<number>();
    values.forEach((value) => queue.enqueue(value));
    expect(drain(queue)).toEqual([...values].sort((a, b) => a - b));
  });

  it("keeps the heap invariant after every enqueue", () => {
    const queue = new PriorityQueue<number>();
    for (const value of seededNumbers(100, 3)) {
      queue.enqueue(value);
      const items = queue.heapItems();
      for (let i = 1; i < items.length; i++) {
        expect(items[(i - 1) >> 1]).toBeLessThanOrEqual(items[i]);
      }
    }
  });

  it("acts as a max-heap with a reversed comparator", () => {
    const queue = new PriorityQueue<number>((a, b) => b - a);
    [3, 9, 1, 7].forEach((value) => queue.enqueue(value));
    expect(queue.front()).toBe(9);
    expect(drain(queue)).toEqual([9, 7, 3, 1]);
  });

  it("orders tuples with a custom comparator", () => {
    const queue = new PriorityQueue<[number, string]>((a, b) => a[0] - b[0]);
    queue.enqueue([2, "b"]).enqueue([1, "a"]).enqueue([3, "c"]);
    expect(queue.dequeue()).toEqual([1, "a"]);
  });

  it("returns null and stays empty when empty", () => {
    const queue = new PriorityQueue<number>();
    expect(queue.dequeue()).toBeNull();
    expect(queue.front()).toBeNull();
    expect(queue.back()).toBeNull();
    expect(queue.size()).toBe(0);
    expect(queue.isEmpty()).toBe(true);
    expect(queue.toArray()).toEqual([]);
  });

  it("enqueue returns the queue for chaining", () => {
    const queue = new PriorityQueue<number>();
    expect(queue.enqueue(1)).toBe(queue);
    expect(queue.size()).toBe(1);
  });

  it("back returns the lowest-priority element", () => {
    const queue = new PriorityQueue<number>();
    seededNumbers(50, 11).forEach((value) => queue.enqueue(value));
    expect(queue.back()).toBe(Math.max(...queue.heapItems()));
    const single = new PriorityQueue<number>().enqueue(4);
    expect(single.back()).toBe(4);
    const pair = new PriorityQueue<number>().enqueue(5).enqueue(2);
    expect(pair.back()).toBe(5);
  });

  it("toArray returns a sorted copy without mutating the heap", () => {
    const queue = new PriorityQueue<number>();
    [5, 1, 4, 2, 3].forEach((value) => queue.enqueue(value));
    const before = [...queue.heapItems()];
    expect(queue.toArray()).toEqual([1, 2, 3, 4, 5]);
    expect([...queue.heapItems()]).toEqual(before);
    expect(queue.size()).toBe(5);
  });

  it("clear empties the queue", () => {
    const queue = new PriorityQueue<number>().enqueue(1).enqueue(2);
    queue.clear();
    expect(queue.isEmpty()).toBe(true);
    expect(queue.dequeue()).toBeNull();
  });

  it("handles undefined values without treating them as empty", () => {
    const queue = new PriorityQueue<undefined>(() => 0);
    queue.enqueue(undefined);
    expect(queue.size()).toBe(1);
    expect(queue.dequeue()).toBeUndefined();
    expect(queue.isEmpty()).toBe(true);
  });
});
