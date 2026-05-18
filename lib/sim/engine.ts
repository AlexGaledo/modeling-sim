import type {
  Customer,
  OrderType,
  PerTypeCount,
  SimParams,
  SimStats,
} from "./types";

/**
 * Deterministic café throughput model (formula-revised.md).
 *
 * One person → one drink → takes exactly `serviceTimeMinutes` → person exits.
 * No randomness, no queueing theory. Same inputs always yield the same output.
 */

export interface RunResult {
  stats: SimStats;
  /** All customers (served + unserved), ordered by arrivalTime for animation. */
  customers: Customer[];
}

const ORDER_TYPES: readonly OrderType[] = ["walkin", "pickup", "delivery"];

export const DEFAULT_CUSTOMERS_BY_TYPE: PerTypeCount = {
  walkin: 50,
  pickup: 25,
  delivery: 25,
};

export const DEFAULT_SERVICE_TIME_MINUTES = 5;

export function drinksPerBarista(horizonMinutes: number, serviceTimeMinutes: number): number {
  if (serviceTimeMinutes <= 0) return 0;
  return Math.floor(horizonMinutes / serviceTimeMinutes);
}

export function runSimulation(params: SimParams): RunResult {
  const { serviceTimeMinutes: s, baristas, baristasPerChannel: b, customersByType, horizonMinutes: H, mode } = params;

  if (s <= 0) throw new Error(`serviceTimeMinutes must be > 0 (got ${s})`);
  if (baristas < 1 || !Number.isInteger(baristas)) throw new Error(`baristas must be a positive integer (got ${baristas})`);
  if (b < 1 || !Number.isInteger(b)) throw new Error(`baristasPerChannel must be a positive integer (got ${b})`);

  const perBarista = drinksPerBarista(H, s);
  const totalCustomers = customersByType.walkin + customersByType.pickup + customersByType.delivery;

  return mode === "single"
    ? runSingle(s, baristas, customersByType, totalCustomers, H, perBarista)
    : runMulti(s, b, customersByType, H, perBarista);
}

/* ------------------------------------------------------------------ */
/*  Single channel — pooled baristas, mixed types interleaved          */
/* ------------------------------------------------------------------ */

function runSingle(
  s: number,
  c: number,
  customersByType: PerTypeCount,
  totalCustomers: number,
  H: number,
  perBarista: number,
): RunResult {
  const customers = buildInterleavedQueue(customersByType, H, totalCustomers);

  const drinksServedByType: PerTypeCount = { walkin: 0, pickup: 0, delivery: 0 };
  const customersUnservedByType: PerTypeCount = { walkin: 0, pickup: 0, delivery: 0 };

  for (let i = 0; i < customers.length; i++) {
    const cust = customers[i] as Customer;
    const start = Math.floor(i / c) * s;
    const end = start + s;
    if (end <= H) {
      cust.serviceStartTime = start;
      cust.departureTime = end;
      drinksServedByType[cust.orderType]++;
    } else {
      customersUnservedByType[cust.orderType]++;
    }
  }

  const drinksServed =
    drinksServedByType.walkin + drinksServedByType.pickup + drinksServedByType.delivery;
  const customersUnserved =
    customersUnservedByType.walkin + customersUnservedByType.pickup + customersUnservedByType.delivery;

  const stats: SimStats = {
    drinksServed,
    drinksServedByType,
    customersUnserved,
    customersUnservedByType,
    drinksPerBarista: perBarista,
    totalBaristas: c,
    horizonMinutes: H,
  };

  return { stats, customers };
}

/* ------------------------------------------------------------------ */
/*  Multi channel — three isolated queues, b baristas each             */
/* ------------------------------------------------------------------ */

function runMulti(
  s: number,
  b: number,
  customersByType: PerTypeCount,
  H: number,
  perBarista: number,
): RunResult {
  const drinksServedByType: PerTypeCount = { walkin: 0, pickup: 0, delivery: 0 };
  const customersUnservedByType: PerTypeCount = { walkin: 0, pickup: 0, delivery: 0 };
  const idle: PerTypeCount = { walkin: 0, pickup: 0, delivery: 0 };

  const all: Customer[] = [];
  let nextId = 0;

  for (const type of ORDER_TYPES) {
    const count = customersByType[type];
    const spacing = count > 0 ? H / count : 0;

    for (let i = 0; i < count; i++) {
      const cust: Customer = {
        id: nextId++,
        orderType: type,
        arrivalTime: i * spacing,
      };
      const start = Math.floor(i / b) * s;
      const end = start + s;
      if (end <= H) {
        cust.serviceStartTime = start;
        cust.departureTime = end;
        drinksServedByType[type]++;
      } else {
        customersUnservedByType[type]++;
      }
      all.push(cust);
    }

    // Idle minutes (revised §4): max(0, (b·perBarista − count) · s).
    idle[type] = Math.max(0, (b * perBarista - count) * s);
  }

  all.sort((a, b2) => a.arrivalTime - b2.arrivalTime);

  const drinksServed =
    drinksServedByType.walkin + drinksServedByType.pickup + drinksServedByType.delivery;
  const customersUnserved =
    customersUnservedByType.walkin + customersUnservedByType.pickup + customersUnservedByType.delivery;

  const stats: SimStats = {
    drinksServed,
    drinksServedByType,
    customersUnserved,
    customersUnservedByType,
    drinksPerBarista: perBarista,
    idleBaristaMinutesByChannel: idle,
    totalBaristas: b * 3,
    horizonMinutes: H,
  };

  return { stats, customers: all };
}

/* ------------------------------------------------------------------ */
/*  Single-channel queue ordering — deterministic, type-mixed          */
/* ------------------------------------------------------------------ */

/**
 * Build a length-N customer queue that interleaves the three order types
 * proportionally (Bresenham-style) so the 3D crowd reads as mixed, not
 * blocked by type. Arrival times spread evenly over the horizon.
 */
function buildInterleavedQueue(
  customersByType: PerTypeCount,
  H: number,
  total: number,
): Customer[] {
  const remaining: PerTypeCount = { ...customersByType };
  const totals: PerTypeCount = { ...customersByType };
  const out: Customer[] = [];

  if (total === 0) return out;
  const spacing = H / total;

  for (let i = 0; i < total; i++) {
    // Pick the type whose remaining-fraction is largest (largest-remainder rule).
    let bestType: OrderType = "walkin";
    let bestScore = -Infinity;
    for (const t of ORDER_TYPES) {
      if (remaining[t] <= 0) continue;
      // Score = remaining_t / total_t — pulls a type "due" for placement.
      const score = remaining[t] / Math.max(1, totals[t]);
      if (score > bestScore) {
        bestScore = score;
        bestType = t;
      }
    }
    remaining[bestType]--;
    out.push({ id: i, orderType: bestType, arrivalTime: i * spacing });
  }

  return out;
}
