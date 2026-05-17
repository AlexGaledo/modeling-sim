import { describe, expect, it } from "vitest";
import { mulberry32, sampleCategorical, sampleExponential } from "../rng";

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it("produces a different sequence for a different seed", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    let diffs = 0;
    for (let i = 0; i < 20; i++) if (a() !== b()) diffs++;
    expect(diffs).toBeGreaterThan(15);
  });

  it("samples in [0, 1)", () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const x = r();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe("sampleExponential", () => {
  it("mean converges to 1/rate", () => {
    const rate = 0.5;
    const rng = mulberry32(123);
    const N = 100_000;
    let sum = 0;
    for (let i = 0; i < N; i++) sum += sampleExponential(rate, rng);
    const mean = sum / N;
    expect(mean).toBeGreaterThan(1.95);
    expect(mean).toBeLessThan(2.05);
  });
});

describe("sampleCategorical", () => {
  it("approximates the configured weights", () => {
    const rng = mulberry32(99);
    const weights = [0.5, 0.3, 0.2];
    const counts = [0, 0, 0];
    const N = 50_000;
    for (let i = 0; i < N; i++) counts[sampleCategorical(weights, rng)]!++;
    expect(counts[0]! / N).toBeGreaterThan(0.49);
    expect(counts[0]! / N).toBeLessThan(0.51);
    expect(counts[1]! / N).toBeGreaterThan(0.29);
    expect(counts[1]! / N).toBeLessThan(0.31);
    expect(counts[2]! / N).toBeGreaterThan(0.19);
    expect(counts[2]! / N).toBeLessThan(0.21);
  });
});
