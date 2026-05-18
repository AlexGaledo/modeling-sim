import { describe, expect, it } from "vitest";
import {
  breakEvenDrinks,
  compareScenarios,
  economicsFromStats,
  laborCostPerHour,
  profitPerHour,
  revenuePerHour,
} from "../economics";
import type { SimStats } from "../types";

function makeStats(overrides: Partial<SimStats> = {}): SimStats {
  return {
    drinksServed: 0,
    drinksServedByType: { walkin: 0, pickup: 0, delivery: 0 },
    customersUnserved: 0,
    customersUnservedByType: { walkin: 0, pickup: 0, delivery: 0 },
    drinksPerBarista: 12,
    totalBaristas: 1,
    horizonMinutes: 60,
    ...overrides,
  };
}

describe("revenuePerHour", () => {
  it("is drinks · p", () => {
    expect(revenuePerHour(36, 3.5)).toBe(126);
  });
});

describe("laborCostPerHour", () => {
  it("is baristas · wage", () => {
    expect(laborCostPerHour(3, 18)).toBe(54);
  });
});

describe("profitPerHour", () => {
  it("revenue − labor", () => {
    expect(profitPerHour(36, 3, 3.5, 18)).toBe(72);
  });
});

describe("breakEvenDrinks", () => {
  it("ceil(labor / p)", () => {
    expect(breakEvenDrinks(3, 18, 3.5)).toBe(16); // ceil(54/3.5) = 16
  });
});

describe("economicsFromStats — worked example §10", () => {
  it("defaults give $72 profit, 16 break-even", () => {
    const stats = makeStats({ drinksServed: 36, totalBaristas: 3 });
    const e = economicsFromStats(stats, { hourlyWage: 18, profitPerDrink: 3.5 });
    expect(e.revenuePerHour).toBe(126);
    expect(e.laborCostPerHour).toBe(54);
    expect(e.profitPerHour).toBe(72);
    expect(e.breakEvenDrinks).toBe(16);
  });
});

describe("compareScenarios", () => {
  it("ties at defaults", () => {
    const single = makeStats({ drinksServed: 36, totalBaristas: 3 });
    const multi = makeStats({ drinksServed: 36, totalBaristas: 3 });
    const r = compareScenarios({ single, multi, hourlyWage: 18, profitPerDrink: 3.5 });
    expect(r.extraDrinks).toBe(0);
    expect(r.deltaProfit).toBe(0);
    expect(r.requiredProfitPerDrink).toBeNull();
  });

  it("single beats multi on imbalanced demand", () => {
    const single = makeStats({ drinksServed: 36, totalBaristas: 3 });
    const multi = makeStats({ drinksServed: 32, totalBaristas: 3 }); // 12+10+10
    const r = compareScenarios({ single, multi, hourlyWage: 18, profitPerDrink: 3.5 });
    expect(r.extraDrinks).toBe(4);
    expect(r.deltaProfit).toBe(-14); // 4 fewer drinks × $3.50
  });
});
