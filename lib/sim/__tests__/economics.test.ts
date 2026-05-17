import { describe, expect, it } from "vitest";
import {
  economicsFromStats,
  laborCostPerHour,
  revenuePerHour,
} from "../economics";
import type { SimStats } from "../types";

describe("revenuePerHour", () => {
  it("computes Σ drinks·profit per hour", () => {
    // 60 drinks over 60 min, all walkin at $3 → $180/hr
    const r = revenuePerHour({ walkin: 60, pickup: 0, delivery: 0 }, { walkin: 3, pickup: 0, delivery: 0 }, 60);
    expect(r).toBe(180);
  });

  it("scales by measured time", () => {
    // 100 walkin drinks over 120 min → 50 drinks/hr · $4 = $200/hr
    const r = revenuePerHour({ walkin: 100, pickup: 0, delivery: 0 }, { walkin: 4, pickup: 0, delivery: 0 }, 120);
    expect(r).toBe(200);
  });

  it("mixes types", () => {
    const r = revenuePerHour(
      { walkin: 30, pickup: 18, delivery: 12 },
      { walkin: 3, pickup: 3, delivery: 1 },
      60,
    );
    // 30·3 + 18·3 + 12·1 = 90 + 54 + 12 = 156
    expect(r).toBe(156);
  });

  it("returns 0 when no measured time", () => {
    expect(revenuePerHour({ walkin: 5, pickup: 0, delivery: 0 }, { walkin: 1, pickup: 0, delivery: 0 }, 0)).toBe(0);
  });
});

describe("laborCostPerHour", () => {
  it("is c · wage", () => {
    expect(laborCostPerHour(3, 18)).toBe(54);
  });
});

describe("economicsFromStats", () => {
  it("revenue − labor = profit", () => {
    const stats: SimStats = {
      rho: 0.5,
      unstable: false,
      ordersServed: 60,
      ordersUnfinished: 0,
      meanWq: 1,
      meanW: 6,
      meanLq: 0.5,
      maxQueueLength: 3,
      measuredMinutes: 60,
      utilization: [0.5],
      drinksServedByType: { walkin: 60, pickup: 0, delivery: 0 },
    };
    const e = economicsFromStats(stats, {
      baristas: 1,
      hourlyWage: 18,
      profitPerDrink: { walkin: 3, pickup: 0, delivery: 0 },
    });
    expect(e.revenuePerHour).toBe(180);
    expect(e.laborCostPerHour).toBe(18);
    expect(e.profitPerHour).toBe(162);
  });
});
