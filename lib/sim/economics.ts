import type { PerTypeCount, ProfitPerDrink, SimStats } from "./types";

export interface EconomicInputs {
  /** drinks served per type, over the measured window (after warmup) */
  drinksServedByType: PerTypeCount;
  /** measured simulated minutes (post-warmup) */
  measuredMinutes: number;
  /** number of baristas (c) */
  baristas: number;
  /** wage per barista, currency / hour */
  hourlyWage: number;
  /** profit per drink by type, currency */
  profitPerDrink: ProfitPerDrink;
}

export interface EconomicMetrics {
  /** Σ drinks_by_type · profit_by_type / measured hours */
  revenuePerHour: number;
  /** c · wage */
  laborCostPerHour: number;
  /** revenue − labor */
  profitPerHour: number;
}

export function revenuePerHour(
  drinks: PerTypeCount,
  profit: ProfitPerDrink,
  measuredMinutes: number,
): number {
  if (measuredMinutes <= 0) return 0;
  const total =
    drinks.walkin * profit.walkin +
    drinks.pickup * profit.pickup +
    drinks.delivery * profit.delivery;
  return total / (measuredMinutes / 60);
}

export function laborCostPerHour(baristas: number, hourlyWage: number): number {
  return baristas * hourlyWage;
}

export function economicsFromStats(stats: SimStats, opts: {
  baristas: number;
  hourlyWage: number;
  profitPerDrink: ProfitPerDrink;
}): EconomicMetrics {
  const rev = revenuePerHour(stats.drinksServedByType, opts.profitPerDrink, stats.measuredMinutes);
  const labor = laborCostPerHour(opts.baristas, opts.hourlyWage);
  return { revenuePerHour: rev, laborCostPerHour: labor, profitPerHour: rev - labor };
}

/** Core KPI from simulation.md §2.4: total queue time / order count, in minutes. */
export function averageTimePerOrder(stats: SimStats): number {
  return stats.meanW;
}

/** Defaults matching simulation.md §2.3. */
export const DEFAULT_PROFIT_PER_DRINK: ProfitPerDrink = {
  walkin: 3.5,
  pickup: 3.5,
  delivery: 2.0,
};

export const DEFAULT_HOURLY_WAGE = 18;
