export type OrderType = "walkin" | "pickup" | "delivery";

export type SimMode = "single" | "multi";

export interface PerTypeCount {
  walkin: number;
  pickup: number;
  delivery: number;
}

export interface Customer {
  id: number;
  orderType: OrderType;
  /** Minute at which the customer enters the shop (visualization timing). */
  arrivalTime: number;
  /** Minute service starts. Undefined if customer is never served within the hour. */
  serviceStartTime?: number;
  /** Minute service finishes (= serviceStartTime + s). Undefined if unserved. */
  departureTime?: number;
}

export interface SimParams {
  /** Service time per drink (minutes), formula-revised.md §1. */
  serviceTimeMinutes: number;
  /** Single-channel pooled baristas (c). */
  baristas: number;
  /** Multi-channel baristas per channel (b). */
  baristasPerChannel: number;
  /** Customers arriving in the hour, split by type (revised §1). */
  customersByType: PerTypeCount;
  /** Simulation horizon (minutes). Defaults to 60. */
  horizonMinutes: number;
  /** Run a pooled single queue or per-type channels. */
  mode: SimMode;
}

export interface SimStats {
  /** Total drinks completed within the hour. */
  drinksServed: number;
  drinksServedByType: PerTypeCount;
  /** Total customers who never received their drink within the hour. */
  customersUnserved: number;
  customersUnservedByType: PerTypeCount;
  /** floor(H / s) — capacity of one barista in the horizon. */
  drinksPerBarista: number;
  /** Multi mode only: idle barista-minutes per channel (revised §4). */
  idleBaristaMinutesByChannel?: PerTypeCount;
  /** Number of baristas in the run (c for single; b·3 for multi). */
  totalBaristas: number;
  horizonMinutes: number;
}
