import { describe, expect, it } from "vitest";
import { runSimulation } from "../engine";
import type { SimParams } from "../types";

function params(overrides: Partial<SimParams> = {}): SimParams {
  return {
    lambda: 1.0,
    mu: 1.0,
    c: 2,
    mix: { walkin: 0.5, pickup: 0.3, delivery: 0.2 },
    serviceMultipliers: { walkin: 1.0, pickup: 0.5, delivery: 2.0 },
    arrivalMode: "poisson",
    seed: 1,
    horizonMinutes: 20_000,
    warmupMinutes: 2_000,
    ...overrides,
  };
}

describe("DES engine — order-type mix", () => {
  it("observed type share converges to configured weights", () => {
    const { customers } = runSimulation(params());
    const counts = { walkin: 0, pickup: 0, delivery: 0 };
    for (const c of customers) counts[c.orderType]++;
    const total = customers.length;
    expect(counts.walkin / total).toBeGreaterThan(0.48);
    expect(counts.walkin / total).toBeLessThan(0.52);
    expect(counts.pickup / total).toBeGreaterThan(0.28);
    expect(counts.pickup / total).toBeLessThan(0.32);
    expect(counts.delivery / total).toBeGreaterThan(0.18);
    expect(counts.delivery / total).toBeLessThan(0.22);
  });

  it("service multipliers shape per-type mean service times", () => {
    const { customers } = runSimulation(params());
    const sums = { walkin: 0, pickup: 0, delivery: 0 };
    const counts = { walkin: 0, pickup: 0, delivery: 0 };
    for (const c of customers) {
      sums[c.orderType] += c.serviceDuration;
      counts[c.orderType]++;
    }
    const meanWalkin = sums.walkin / counts.walkin;
    const meanPickup = sums.pickup / counts.pickup;
    const meanDelivery = sums.delivery / counts.delivery;
    // base mean = 1/μ = 1 min; multipliers are 1.0 / 0.5 / 2.0
    expect(meanWalkin).toBeGreaterThan(0.9);
    expect(meanWalkin).toBeLessThan(1.1);
    expect(meanPickup).toBeGreaterThan(0.45);
    expect(meanPickup).toBeLessThan(0.55);
    expect(meanDelivery).toBeGreaterThan(1.85);
    expect(meanDelivery).toBeLessThan(2.15);
  });
});
