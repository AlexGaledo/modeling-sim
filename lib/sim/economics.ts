import type { SimStats } from "./types";

/**
 * Economic model per formula-revised.md §6 and §7.
 * Deterministic, hourly. drinks × profit − baristas × wage.
 */

export interface EconomicMetrics {
  revenuePerHour: number;
  laborCostPerHour: number;
  profitPerHour: number;
  breakEvenDrinks: number;
}

export const DEFAULT_PROFIT_PER_DRINK = 3.5;
export const DEFAULT_HOURLY_WAGE = 18;

export function revenuePerHour(drinksServed: number, profitPerDrink: number): number {
  return drinksServed * profitPerDrink;
}

export function laborCostPerHour(totalBaristas: number, hourlyWage: number): number {
  return totalBaristas * hourlyWage;
}

export function profitPerHour(
  drinksServed: number,
  totalBaristas: number,
  profitPerDrink: number,
  hourlyWage: number,
): number {
  return revenuePerHour(drinksServed, profitPerDrink) - laborCostPerHour(totalBaristas, hourlyWage);
}

export function breakEvenDrinks(
  totalBaristas: number,
  hourlyWage: number,
  profitPerDrink: number,
): number {
  if (profitPerDrink <= 0) return Infinity;
  return Math.ceil((totalBaristas * hourlyWage) / profitPerDrink);
}

export function economicsFromStats(
  stats: SimStats,
  opts: { hourlyWage: number; profitPerDrink: number },
): EconomicMetrics {
  const rev = revenuePerHour(stats.drinksServed, opts.profitPerDrink);
  const labor = laborCostPerHour(stats.totalBaristas, opts.hourlyWage);
  return {
    revenuePerHour: rev,
    laborCostPerHour: labor,
    profitPerHour: rev - labor,
    breakEvenDrinks: breakEvenDrinks(stats.totalBaristas, opts.hourlyWage, opts.profitPerDrink),
  };
}

/* ------------------------------------------------------------------ */
/*  Cross-scenario comparison (revised §7)                              */
/* ------------------------------------------------------------------ */

export interface CompareInputs {
  single: SimStats;
  multi: SimStats;
  hourlyWage: number;
  profitPerDrink: number;
}

export interface CompareResult {
  extraDrinks: number;
  deltaProfit: number;
  /** Required profit/drink for ΔProfit = 0 when barista counts differ. null otherwise. */
  requiredProfitPerDrink: number | null;
}

export function compareScenarios({ single, multi, hourlyWage, profitPerDrink }: CompareInputs): CompareResult {
  const extraDrinks = single.drinksServed - multi.drinksServed;
  const deltaProfit =
    profitPerHour(multi.drinksServed, multi.totalBaristas, profitPerDrink, hourlyWage) -
    profitPerHour(single.drinksServed, single.totalBaristas, profitPerDrink, hourlyWage);

  const drinkDiff = multi.drinksServed - single.drinksServed;
  const baristaDiff = multi.totalBaristas - single.totalBaristas;
  const requiredProfitPerDrink =
    drinkDiff !== 0 ? (baristaDiff * hourlyWage) / drinkDiff : null;

  return { extraDrinks, deltaProfit, requiredProfitPerDrink };
}
