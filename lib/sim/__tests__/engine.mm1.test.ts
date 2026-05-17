import { describe, expect, it } from "vitest";
import { DEFAULT_MIX, DEFAULT_SERVICE_MULTIPLIERS, runSimulation } from "../engine";
import { mm1 } from "../queueing";
import type { SimParams } from "../types";

function baseParams(overrides: Partial<SimParams> = {}): SimParams {
  return {
    lambda: 0.6,
    mu: 1.0,
    c: 1,
    mix: DEFAULT_MIX,
    serviceMultipliers: { walkin: 1, pickup: 1, delivery: 1 },
    arrivalMode: "poisson",
    seed: 1,
    horizonMinutes: 20_000,
    warmupMinutes: 2_000,
    ...overrides,
  };
}

describe("DES engine — M/M/1 validation against closed form", () => {
  // Run multiple seeds, average — single replications wobble.
  function avgWq(params: Omit<SimParams, "seed">, reps: number): number {
    let total = 0;
    for (let s = 1; s <= reps; s++) {
      const { stats } = runSimulation({ ...params, seed: s });
      total += stats.meanWq;
    }
    return total / reps;
  }

  it.each([
    { lambda: 0.3, mu: 1.0 },
    { lambda: 0.6, mu: 1.0 },
    { lambda: 0.8, mu: 1.0 },
  ])("ρ = $lambda: sampled Wq matches theory (±15%)", ({ lambda, mu }) => {
    const theory = mm1(lambda, mu);
    const sampled = avgWq(baseParams({ lambda, mu }), 8);
    const relErr = Math.abs(sampled - theory.Wq) / theory.Wq;
    expect(relErr).toBeLessThan(0.15);
  });
});

describe("DES engine — stability behavior", () => {
  it("ρ ≥ 1: marks unstable, queue grows without clamping", () => {
    // λ = 1.5, μ = 1 → ρ = 1.5
    const short = runSimulation(baseParams({ lambda: 1.5, mu: 1, horizonMinutes: 500, warmupMinutes: 0 }));
    const long = runSimulation(baseParams({ lambda: 1.5, mu: 1, horizonMinutes: 2000, warmupMinutes: 0 }));
    expect(short.stats.unstable).toBe(true);
    expect(long.stats.unstable).toBe(true);
    // Longer horizon → strictly larger backlog (queue NOT clamped).
    expect(long.stats.maxQueueLength).toBeGreaterThan(short.stats.maxQueueLength);
    // Meaningful number of customers should have arrived but not departed.
    expect(long.stats.ordersUnfinished).toBeGreaterThan(0);
  });
});

describe("DES engine — determinism", () => {
  it("same seed → byte-identical stats", () => {
    const p = baseParams({ seed: 7 });
    const a = runSimulation(p);
    const b = runSimulation(p);
    expect(a.stats).toEqual(b.stats);
  });

  it("different seed → different stats", () => {
    const a = runSimulation(baseParams({ seed: 1 }));
    const b = runSimulation(baseParams({ seed: 2 }));
    expect(a.stats.meanWq).not.toBe(b.stats.meanWq);
  });
});
