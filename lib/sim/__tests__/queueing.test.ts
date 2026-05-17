import { describe, expect, it } from "vitest";
import { mm1, mmc } from "../queueing";

describe("mm1", () => {
  it("textbook example: λ=0.5, μ=1 → Wq=1, W=2, Lq=0.5", () => {
    const r = mm1(0.5, 1);
    expect(r.unstable).toBe(false);
    expect(r.rho).toBeCloseTo(0.5, 10);
    expect(r.Wq).toBeCloseTo(1, 10);
    expect(r.W).toBeCloseTo(2, 10);
    expect(r.Lq).toBeCloseTo(0.5, 10);
  });

  it("flags unstable when ρ ≥ 1", () => {
    const r = mm1(1.2, 1);
    expect(r.unstable).toBe(true);
    expect(r.Wq).toBe(Infinity);
  });
});

describe("mmc", () => {
  it("matches mm1 when c=1", () => {
    const a = mm1(0.5, 1);
    const b = mmc(0.5, 1, 1);
    expect(b.Wq).toBeCloseTo(a.Wq, 10);
    expect(b.W).toBeCloseTo(a.W, 10);
  });

  it("textbook M/M/2: λ=1, μ=0.75, c=2 → ρ≈0.667, Pwait≈0.5, Wq≈1", () => {
    // a = 4/3, ρ = 2/3, Σ = 1 + 4/3 = 7/3, a²/2! = 8/9
    // Pwait = (8/9 · 3) / (7/3 + 8/9·3) = (8/3) / (7/3 + 8/3) = 8/15 ≈ 0.5333
    // Wq = Pwait / (cμ − λ) = 0.5333 / (1.5 − 1) ≈ 1.0667
    const r = mmc(1, 0.75, 2);
    expect(r.unstable).toBe(false);
    expect(r.rho).toBeCloseTo(2 / 3, 10);
    expect(r.Wq).toBeCloseTo(8 / 15 / 0.5, 6);
    expect(r.W).toBeCloseTo(r.Wq + 1 / 0.75, 6);
  });

  it("flags unstable when ρ ≥ 1", () => {
    const r = mmc(5, 1, 3);
    expect(r.unstable).toBe(true);
  });
});
