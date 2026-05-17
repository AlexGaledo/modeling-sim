"use client";

import { create } from "zustand";
import { DEFAULT_HOURLY_WAGE, DEFAULT_PROFIT_PER_DRINK } from "./sim/economics";
import { DEFAULT_SERVICE_MULTIPLIERS } from "./sim/engine";
import type { OrderMix, ProfitPerDrink, ServiceMultipliers } from "./sim/types";

export type Mode = "single" | "multi" | "compare";
export type PlayState = "idle" | "running" | "done";

export interface AppState {
  walkinPerHour: number;
  pickupPerHour: number;
  deliveryPerHour: number;
  baristas: number;
  baristasPerChannel: number;
  serviceTimeMinutes: number;
  mode: Mode;
  simSpeed: number;

  // Hidden defaults (not exposed as sliders)
  serviceMultipliers: ServiceMultipliers;
  hourlyWage: number;
  profitPerDrink: ProfitPerDrink;
  seed: number;
  horizonMinutes: number;
  warmupMinutes: number;

  // Play control
  playState: PlayState;
  runId: number;

  setWalkinPerHour: (v: number) => void;
  setPickupPerHour: (v: number) => void;
  setDeliveryPerHour: (v: number) => void;
  setBaristas: (v: number) => void;
  setBaristasPerChannel: (v: number) => void;
  setServiceTimeMinutes: (v: number) => void;
  setMode: (m: Mode) => void;
  setSimSpeed: (v: number) => void;
  play: () => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  walkinPerHour: 50,
  pickupPerHour: 30,
  deliveryPerHour: 20,
  baristas: 2,
  baristasPerChannel: 1,
  serviceTimeMinutes: 5,
  mode: "single",
  simSpeed: 10,

  serviceMultipliers: { ...DEFAULT_SERVICE_MULTIPLIERS },
  hourlyWage: DEFAULT_HOURLY_WAGE,
  profitPerDrink: { ...DEFAULT_PROFIT_PER_DRINK },
  seed: (Math.random() * 2 ** 31) | 0,
  horizonMinutes: 60,
  warmupMinutes: 5,

  playState: "idle",
  runId: 0,

  setWalkinPerHour: (v) => set({ walkinPerHour: v }),
  setPickupPerHour: (v) => set({ pickupPerHour: v }),
  setDeliveryPerHour: (v) => set({ deliveryPerHour: v }),
  setBaristas: (v) => set({ baristas: v }),
  setBaristasPerChannel: (v) => set({ baristasPerChannel: v }),
  setServiceTimeMinutes: (v) => set({ serviceTimeMinutes: v }),
  setMode: (m) => set({ mode: m }),
  setSimSpeed: (v) => set({ simSpeed: v }),
  play: () => set((s) => ({ playState: "running", runId: s.runId + 1 })),
  reset: () => set({ playState: "idle", runId: 0 }),
}));

/** Base SimParams template — consumers override c / mix / lambda per mode. */
export function selectSimParams(s: AppState) {
  const total = s.walkinPerHour + s.pickupPerHour + s.deliveryPerHour;
  return {
    lambda: total > 0 ? total / 60 : 0.01,
    mu: 1 / s.serviceTimeMinutes,
    c: s.baristas,
    mix: {
      walkin: total > 0 ? s.walkinPerHour / total : 1 / 3,
      pickup: total > 0 ? s.pickupPerHour / total : 1 / 3,
      delivery: total > 0 ? s.deliveryPerHour / total : 1 / 3,
    } satisfies OrderMix,
    serviceMultipliers: s.serviceMultipliers,
    arrivalMode: "poisson" as const,
    seed: s.seed,
    horizonMinutes: s.horizonMinutes,
    warmupMinutes: s.warmupMinutes,
  };
}
