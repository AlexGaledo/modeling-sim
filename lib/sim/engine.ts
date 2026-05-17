import { MinHeap } from "./heap";
import { mulberry32, sampleCategorical, sampleExponential, type Rng } from "./rng";
import type {
  ArrivalMode,
  Customer,
  OrderMix,
  OrderType,
  PerTypeCount,
  ServiceMultipliers,
  SimEvent,
  SimParams,
  SimStats,
} from "./types";

const ORDER_TYPES: readonly OrderType[] = ["walkin", "pickup", "delivery"];

export interface RunResult {
  stats: SimStats;
  customers: Customer[];
}

/**
 * Discrete-event simulation of M/M/c (c=1 → M/M/1).
 * Pure function: same SimParams → same RunResult (determinism is an invariant).
 */
export function runSimulation(params: SimParams): RunResult {
  const { lambda, mu, c, mix, serviceMultipliers, arrivalMode, seed, horizonMinutes, warmupMinutes } =
    params;

  if (c < 1 || !Number.isInteger(c)) throw new Error(`c must be a positive integer (got ${c})`);
  if (lambda <= 0) throw new Error(`lambda must be > 0`);
  if (mu <= 0) throw new Error(`mu must be > 0`);

  if (typeof window !== "undefined") {
    console.log(`[ENGINE] Starting runSimulation: lambda=${lambda}, mu=${mu}, c=${c}, horizon=${horizonMinutes}, warmup=${warmupMinutes}, seed=${seed}`);
  }

  const rng: Rng = mulberry32(seed);
  const events = new MinHeap<SimEvent>((e) => e.time);

  // Future arrivals are seeded lazily — schedule the next one as each fires. This keeps
  // a single arrival stream regardless of c, which is what the fairness test relies on.
  const firstArrival = drawInterArrival(lambda, arrivalMode, rng);
  events.push({ time: firstArrival, type: "ARRIVAL", customerId: 0 });

  const customers: Customer[] = [];
  const queue: number[] = []; // customer IDs waiting in FIFO
  const baristaBusyUntil: number[] = new Array(c).fill(0);
  const baristaBusyMinutes: number[] = new Array(c).fill(0);
  const baristaBusyMinutesAfterWarmup: number[] = new Array(c).fill(0);
  const baristaServingCustomer: (number | null)[] = new Array(c).fill(null);
  let baristaIdleCount = c;

  let nextCustomerId = 0;
  let maxQueueLength = 0;

  // Time-weighted queue length accumulator (after warmup).
  let lastChangeTime = 0;
  let qIntegralAfterWarmup = 0;

  const updateQueueIntegral = (now: number) => {
    if (now > lastChangeTime) {
      const fromT = Math.max(lastChangeTime, warmupMinutes);
      const toT = Math.max(now, warmupMinutes);
      if (toT > fromT) qIntegralAfterWarmup += queue.length * (toT - fromT);
      lastChangeTime = now;
    }
  };

  const orderMixWeights: number[] = [mix.walkin, mix.pickup, mix.delivery];

  while (events.size > 0) {
    const ev = events.pop() as SimEvent;
    if (ev.time > horizonMinutes) break;

    updateQueueIntegral(ev.time);

    if (ev.type === "ARRIVAL") {
      const orderType = ORDER_TYPES[sampleCategorical(orderMixWeights, rng)] as OrderType;
      const baseService = sampleExponential(mu, rng);
      const serviceDuration = baseService * multiplierFor(orderType, serviceMultipliers);
      const cust: Customer = {
        id: ev.customerId,
        orderType,
        arrivalTime: ev.time,
        serviceDuration,
      };
      customers.push(cust);

      // Schedule the next arrival now so the arrival stream depends only on (seed, lambda).
      nextCustomerId = ev.customerId + 1;
      const dt = drawInterArrival(lambda, arrivalMode, rng);
      const nextTime = ev.time + dt;
      if (nextTime <= horizonMinutes) {
        events.push({ time: nextTime, type: "ARRIVAL", customerId: nextCustomerId });
      }

      if (baristaIdleCount > 0) {
        const baristaId = pickIdleBarista(baristaServingCustomer);
        startService(ev.time, cust, baristaId);
      } else {
        queue.push(cust.id);
        if (queue.length > maxQueueLength) maxQueueLength = queue.length;
      }
    } else if (ev.type === "SERVICE_END") {
      const baristaId = ev.baristaId as number;
      const cust = customers[ev.customerId] as Customer;
      cust.departureTime = ev.time;

      const startedAt = cust.serviceStartTime ?? ev.time;
      const busy = ev.time - startedAt;
      baristaBusyMinutes[baristaId] = (baristaBusyMinutes[baristaId] ?? 0) + busy;
      const overlapStart = Math.max(startedAt, warmupMinutes);
      const overlapEnd = Math.max(ev.time, warmupMinutes);
      if (overlapEnd > overlapStart) {
        baristaBusyMinutesAfterWarmup[baristaId] =
          (baristaBusyMinutesAfterWarmup[baristaId] ?? 0) + (overlapEnd - overlapStart);
      }

      baristaServingCustomer[baristaId] = null;
      baristaIdleCount++;

      const nextCustomerIdInQueue = queue.shift();
      if (nextCustomerIdInQueue !== undefined) {
        const nextCust = customers[nextCustomerIdInQueue] as Customer;
        const idleId = pickIdleBarista(baristaServingCustomer);
        startService(ev.time, nextCust, idleId);
      }
    }
  }

  function startService(now: number, cust: Customer, baristaId: number): void {
    cust.serviceStartTime = now;
    baristaServingCustomer[baristaId] = cust.id;
    baristaIdleCount--;
    const endTime = now + cust.serviceDuration;
    baristaBusyUntil[baristaId] = endTime;
    events.push({ time: endTime, type: "SERVICE_END", customerId: cust.id, baristaId });
  }

  // Post-run stats (warmup-discarded).
  const measuredMinutes = Math.max(0, horizonMinutes - warmupMinutes);
  let totalWq = 0;
  let totalW = 0;
  let servedAfterWarmup = 0;
  let unfinishedAfterWarmup = 0;
  const drinksServedByType: PerTypeCount = { walkin: 0, pickup: 0, delivery: 0 };

  for (const cust of customers) {
    if (cust.arrivalTime < warmupMinutes) continue;
    if (cust.departureTime === undefined) {
      unfinishedAfterWarmup++;
      continue;
    }
    const wq = (cust.serviceStartTime as number) - cust.arrivalTime;
    const w = (cust.departureTime as number) - cust.arrivalTime;
    totalWq += wq;
    totalW += w;
    servedAfterWarmup++;
    drinksServedByType[cust.orderType]++;
  }

  const meanWq = servedAfterWarmup > 0 ? totalWq / servedAfterWarmup : 0;
  const meanW = servedAfterWarmup > 0 ? totalW / servedAfterWarmup : 0;
  const meanLq = measuredMinutes > 0 ? qIntegralAfterWarmup / measuredMinutes : 0;
  const utilization = baristaBusyMinutesAfterWarmup.map((b) =>
    measuredMinutes > 0 ? b / measuredMinutes : 0,
  );

  const rho = lambda / (c * mu);
  const stats: SimStats = {
    rho,
    unstable: rho >= 1,
    ordersServed: servedAfterWarmup,
    ordersUnfinished: unfinishedAfterWarmup,
    meanWq,
    meanW,
    meanLq,
    maxQueueLength,
    measuredMinutes,
    utilization,
    drinksServedByType,
  };

  return { stats, customers };
}

function drawInterArrival(lambda: number, mode: ArrivalMode, rng: Rng): number {
  return mode === "poisson" ? sampleExponential(lambda, rng) : 1 / lambda;
}

function multiplierFor(t: OrderType, m: ServiceMultipliers): number {
  return t === "walkin" ? m.walkin : t === "pickup" ? m.pickup : m.delivery;
}

function pickIdleBarista(serving: readonly (number | null)[]): number {
  for (let i = 0; i < serving.length; i++) if (serving[i] === null) return i;
  throw new Error("pickIdleBarista called when no barista was idle");
}

/** Defaults that match simulation.md §2.3. */
export const DEFAULT_MIX: OrderMix = { walkin: 0.5, pickup: 0.3, delivery: 0.2 };
export const DEFAULT_SERVICE_MULTIPLIERS: ServiceMultipliers = {
  walkin: 1.0,
  pickup: 0.9,
  delivery: 1.0,
};
