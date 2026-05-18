import { describe, expect, it } from "vitest";
import { DEFAULT_CUSTOMERS_BY_TYPE, runSimulation } from "../engine";
import type { SimParams } from "../types";

const DEFAULTS: Omit<SimParams, "mode"> = {
  serviceTimeMinutes: 5,
  baristas: 3,
  baristasPerChannel: 1,
  customersByType: DEFAULT_CUSTOMERS_BY_TYPE,
  horizonMinutes: 60,
};

describe("worked example §10 — single channel", () => {
  it("c=3, s=5 → 36 drinks served", () => {
    const r = runSimulation({ ...DEFAULTS, mode: "single" });
    expect(r.stats.drinksServed).toBe(36);
    expect(r.stats.drinksPerBarista).toBe(12);
    expect(r.stats.totalBaristas).toBe(3);
    expect(r.stats.customersUnserved).toBe(100 - 36);
  });
});

describe("worked example §10 — multi channel", () => {
  it("b=1 per channel, s=5 → 12+12+12 = 36, idle 0/0/0", () => {
    const r = runSimulation({ ...DEFAULTS, mode: "multi" });
    expect(r.stats.drinksServed).toBe(36);
    expect(r.stats.drinksServedByType).toEqual({ walkin: 12, pickup: 12, delivery: 12 });
    expect(r.stats.totalBaristas).toBe(3);
    expect(r.stats.idleBaristaMinutesByChannel).toEqual({ walkin: 0, pickup: 0, delivery: 0 });
  });
});

describe("idle minutes (revised §4)", () => {
  it("imbalanced: walkin=50 pickup=5 delivery=5, b=1, s=5", () => {
    const r = runSimulation({
      ...DEFAULTS,
      mode: "multi",
      customersByType: { walkin: 50, pickup: 5, delivery: 5 },
    });
    // walkin: served=12, idle=0; pickup: served=5, idle=(12−5)·5=35; delivery same.
    expect(r.stats.drinksServedByType).toEqual({ walkin: 12, pickup: 5, delivery: 5 });
    expect(r.stats.drinksServed).toBe(22);
    expect(r.stats.idleBaristaMinutesByChannel).toEqual({ walkin: 0, pickup: 35, delivery: 35 });
  });
});

describe("single beats multi on imbalanced demand", () => {
  it("walkin=80 pickup=10 delivery=10 → single 36, multi 12+10+10=32", () => {
    const customersByType = { walkin: 80, pickup: 10, delivery: 10 };
    const single = runSimulation({ ...DEFAULTS, mode: "single", customersByType });
    const multi = runSimulation({ ...DEFAULTS, mode: "multi", customersByType });
    expect(single.stats.drinksServed).toBe(36);
    expect(multi.stats.drinksServed).toBe(32);
  });
});

describe("service-time scaling", () => {
  it("s=10, c=3 → drinksPerBarista=6, served=min(N,18)", () => {
    const r = runSimulation({ ...DEFAULTS, mode: "single", serviceTimeMinutes: 10 });
    expect(r.stats.drinksPerBarista).toBe(6);
    expect(r.stats.drinksServed).toBe(18);
  });

  it("s=7, c=1 → drinksPerBarista=floor(60/7)=8", () => {
    const r = runSimulation({ ...DEFAULTS, mode: "single", serviceTimeMinutes: 7, baristas: 1 });
    expect(r.stats.drinksPerBarista).toBe(8);
    expect(r.stats.drinksServed).toBe(8);
  });
});

describe("determinism", () => {
  it("same params → identical output", () => {
    const a = runSimulation({ ...DEFAULTS, mode: "single" });
    const b = runSimulation({ ...DEFAULTS, mode: "single" });
    expect(a.stats).toEqual(b.stats);
    expect(a.customers).toEqual(b.customers);
  });
});

describe("customer events for animation", () => {
  it("served customers have serviceStartTime and departureTime; unserved do not", () => {
    const r = runSimulation({ ...DEFAULTS, mode: "single" });
    let served = 0;
    let unserved = 0;
    for (const c of r.customers) {
      if (c.departureTime !== undefined) {
        served++;
        expect(c.serviceStartTime).toBeDefined();
        expect(c.departureTime).toBe((c.serviceStartTime as number) + 5);
      } else {
        unserved++;
        expect(c.serviceStartTime).toBeUndefined();
      }
    }
    expect(served).toBe(36);
    expect(unserved).toBe(64);
  });

  it("multi mode produces N customers spread across arrivalTime", () => {
    const r = runSimulation({ ...DEFAULTS, mode: "multi" });
    expect(r.customers.length).toBe(100);
    // Sorted by arrivalTime
    for (let i = 1; i < r.customers.length; i++) {
      expect(r.customers[i]!.arrivalTime).toBeGreaterThanOrEqual(r.customers[i - 1]!.arrivalTime);
    }
  });
});
