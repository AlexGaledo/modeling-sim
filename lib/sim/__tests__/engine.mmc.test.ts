import { describe, expect, it } from "vitest";
import { DEFAULT_MIX, runSimulation } from "../engine";
import { mmc } from "../queueing";
import type { SimParams } from "../types";

function baseParams(overrides: Partial<SimParams> = {}): SimParams {
  return {
    lambda: 1.5,
    mu: 1.0,
    c: 2,
    mix: DEFAULT_MIX,
    serviceMultipliers: { walkin: 1, pickup: 1, delivery: 1 },
    arrivalMode: "poisson",
    seed: 1,
    horizonMinutes: 20_000,
    warmupMinutes: 2_000,
    ...overrides,
  };
}

function avgWq(params: Omit<SimParams, "seed">, reps: number): number {
  let total = 0;
  for (let s = 1; s <= reps; s++) {
    const { stats } = runSimulation({ ...params, seed: s });
    total += stats.meanWq;
  }
  return total / reps;
}

describe("DES engine — M/M/c validation against Erlang-C", () => {
  it.each([
    { c: 2, lambda: 1.5, mu: 1.0 },
    { c: 3, lambda: 2.4, mu: 1.0 },
    { c: 5, lambda: 4.0, mu: 1.0 },
  ])("c=$c, ρ stable: sampled Wq matches theory (±15%)", ({ c, lambda, mu }) => {
    const theory = mmc(lambda, mu, c);
    const sampled = avgWq(baseParams({ c, lambda, mu }), 8);
    const relErr = Math.abs(sampled - theory.Wq) / theory.Wq;
    expect(relErr).toBeLessThan(0.15);
  });
});

describe("DES engine — arrival-stream fairness across c", () => {
  it("single (c=1) and multi (c=5) on same seed yield identical arrival times", () => {
    const p = baseParams({ horizonMinutes: 500, warmupMinutes: 0 });
    const a = runSimulation({ ...p, c: 1 });
    const b = runSimulation({ ...p, c: 5 });

    // Customer IDs and arrival times must match across servers — the arrival stream is
    // a function of (seed, lambda, mix) only, not c.
    const n = Math.min(a.customers.length, b.customers.length, 200);
    expect(n).toBeGreaterThan(50);
    for (let i = 0; i < n; i++) {
      expect(b.customers[i]!.arrivalTime).toBe(a.customers[i]!.arrivalTime);
      expect(b.customers[i]!.orderType).toBe(a.customers[i]!.orderType);
    }
  });
});
