export type OrderType = "walkin" | "pickup" | "delivery";

export type EventType = "ARRIVAL" | "SERVICE_START" | "SERVICE_END";

export interface SimEvent {
  time: number;
  type: EventType;
  customerId: number;
  baristaId?: number;
}

export interface Customer {
  id: number;
  orderType: OrderType;
  arrivalTime: number;
  serviceStartTime?: number;
  departureTime?: number;
  serviceDuration: number;
}

export type ArrivalMode = "poisson" | "deterministic";

export interface OrderMix {
  walkin: number;
  pickup: number;
  delivery: number;
}

export interface ServiceMultipliers {
  walkin: number;
  pickup: number;
  delivery: number;
}

export interface ProfitPerDrink {
  walkin: number;
  pickup: number;
  delivery: number;
}

export interface SimParams {
  /** arrival rate in orders/min (λ) */
  lambda: number;
  /** service rate in drinks/min per barista (μ = 1 / serviceTime) */
  mu: number;
  /** number of parallel baristas */
  c: number;
  /** order-type mix; weights are normalized */
  mix: OrderMix;
  /** per-type service-time multiplier (drives the actual service draw) */
  serviceMultipliers: ServiceMultipliers;
  /** Poisson (exponential) or deterministic (fixed 1/λ) arrivals */
  arrivalMode: ArrivalMode;
  /** PRNG seed; same seed must reproduce a run exactly */
  seed: number;
  /** total simulated minutes */
  horizonMinutes: number;
  /** minutes of warm-up time discarded from statistics */
  warmupMinutes: number;
}

export interface PerTypeCount {
  walkin: number;
  pickup: number;
  delivery: number;
}

export interface SimStats {
  /** ρ = λ / (c·μ) */
  rho: number;
  /** True when ρ ≥ 1. Wq/W are still the sampled values — never clamped. */
  unstable: boolean;
  /** customers that departed after warmup (basis for the means below) */
  ordersServed: number;
  /** customers that arrived after warmup but never departed (still in system/queue) */
  ordersUnfinished: number;
  /** mean waiting time in queue (min), after warmup */
  meanWq: number;
  /** mean time in system (min), after warmup */
  meanW: number;
  /** mean queue length (time-weighted, after warmup) */
  meanLq: number;
  /** maximum observed queue length over the whole run */
  maxQueueLength: number;
  /** simulated minutes used for statistics (horizon − warmup) */
  measuredMinutes: number;
  /** per-barista utilization (busy time / measured time) */
  utilization: number[];
  drinksServedByType: PerTypeCount;
}
