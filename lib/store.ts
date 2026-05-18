"use client";

import { create } from "zustand";
import { DEFAULT_HOURLY_WAGE, DEFAULT_PROFIT_PER_DRINK } from "./sim/economics";
import { DEFAULT_CUSTOMERS_BY_TYPE, DEFAULT_SERVICE_TIME_MINUTES } from "./sim/engine";
import type { SimMode, SimParams } from "./sim/types";

export type Mode = "single" | "multi" | "compare";
export type PlayState = "idle" | "running" | "done";

export interface AppState {
  walkinPerHour: number;
  pickupPerHour: number;
  deliveryPerHour: number;
  baristas: number;
  baristasPerChannel: number;
  serviceTimeMinutes: number;
  hourlyWage: number;
  profitPerDrink: number;
  mode: Mode;
  simSpeed: number;

  horizonMinutes: number;

  // Play control
  playState: PlayState;
  runId: number;

  setWalkinPerHour: (v: number) => void;
  setPickupPerHour: (v: number) => void;
  setDeliveryPerHour: (v: number) => void;
  setBaristas: (v: number) => void;
  setBaristasPerChannel: (v: number) => void;
  setServiceTimeMinutes: (v: number) => void;
  setHourlyWage: (v: number) => void;
  setProfitPerDrink: (v: number) => void;
  setMode: (m: Mode) => void;
  setSimSpeed: (v: number) => void;
  play: () => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  walkinPerHour: DEFAULT_CUSTOMERS_BY_TYPE.walkin,
  pickupPerHour: DEFAULT_CUSTOMERS_BY_TYPE.pickup,
  deliveryPerHour: DEFAULT_CUSTOMERS_BY_TYPE.delivery,
  baristas: 3,
  baristasPerChannel: 1,
  serviceTimeMinutes: DEFAULT_SERVICE_TIME_MINUTES,
  hourlyWage: DEFAULT_HOURLY_WAGE,
  profitPerDrink: DEFAULT_PROFIT_PER_DRINK,
  mode: "single",
  simSpeed: 10,

  horizonMinutes: 60,

  playState: "idle",
  runId: 0,

  setWalkinPerHour: (v) => set({ walkinPerHour: v }),
  setPickupPerHour: (v) => set({ pickupPerHour: v }),
  setDeliveryPerHour: (v) => set({ deliveryPerHour: v }),
  setBaristas: (v) => set({ baristas: v }),
  setBaristasPerChannel: (v) => set({ baristasPerChannel: v }),
  setServiceTimeMinutes: (v) => set({ serviceTimeMinutes: v }),
  setHourlyWage: (v) => set({ hourlyWage: v }),
  setProfitPerDrink: (v) => set({ profitPerDrink: v }),
  setMode: (m) => set({ mode: m }),
  setSimSpeed: (v) => set({ simSpeed: v }),
  play: () => set((s) => ({ playState: "running", runId: s.runId + 1 })),
  reset: () => set({ playState: "idle", runId: 0 }),
}));

/**
 * Build SimParams for the deterministic engine. Compare mode runs both
 * sub-scenarios, so consumers may override `mode` when calling.
 */
export function selectSimParams(s: AppState): SimParams {
  const simMode: SimMode = s.mode === "multi" ? "multi" : "single";
  return {
    serviceTimeMinutes: s.serviceTimeMinutes,
    baristas: s.baristas,
    baristasPerChannel: s.baristasPerChannel,
    customersByType: {
      walkin: s.walkinPerHour,
      pickup: s.pickupPerHour,
      delivery: s.deliveryPerHour,
    },
    horizonMinutes: s.horizonMinutes,
    mode: simMode,
  };
}
