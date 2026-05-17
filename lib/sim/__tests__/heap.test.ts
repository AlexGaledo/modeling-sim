import { describe, expect, it } from "vitest";
import { MinHeap } from "../heap";
import { mulberry32 } from "../rng";

describe("MinHeap", () => {
  it("pops items in ascending key order", () => {
    const h = new MinHeap<number>((x) => x);
    const rng = mulberry32(1);
    const xs: number[] = [];
    for (let i = 0; i < 200; i++) {
      const v = rng();
      xs.push(v);
      h.push(v);
    }
    const sorted = [...xs].sort((a, b) => a - b);
    const out: number[] = [];
    while (h.size > 0) out.push(h.pop() as number);
    expect(out).toEqual(sorted);
  });

  it("handles interleaved push/pop", () => {
    const h = new MinHeap<{ t: number; id: number }>((e) => e.t);
    h.push({ t: 3, id: 1 });
    h.push({ t: 1, id: 2 });
    h.push({ t: 2, id: 3 });
    expect(h.pop()!.id).toBe(2);
    h.push({ t: 0.5, id: 4 });
    expect(h.pop()!.id).toBe(4);
    expect(h.pop()!.id).toBe(3);
    expect(h.pop()!.id).toBe(1);
    expect(h.pop()).toBeUndefined();
  });

  it("peek does not remove", () => {
    const h = new MinHeap<number>((x) => x);
    h.push(5);
    h.push(2);
    expect(h.peek()).toBe(2);
    expect(h.size).toBe(2);
  });
});
