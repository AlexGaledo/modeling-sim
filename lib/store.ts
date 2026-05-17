"use client";

import { create } from "zustand";
import { DEFAULT_HOURLY_WAGE, DEFAULT_PROFIT_PER_DRINK } from "./sim/economics";
import { DEFAULT_MIX, DEFAULT_SERVICE_MULTIPLIERS } from "./sim/engine";
import type { OrderMix, ProfitPerDrink, ServiceMultipliers } from "./sim/types";

export type Mode = "single" | "multi" | "compare";
export type PlayState = "idle" | "running" | "done";

export interface AppState {
  ordersPerHour: number;
  baristas: number;
  serviceTimeMinutes: number;
  mode: Mode;
  simSpeed: number;

  // Hidden defaults (not exposed as sliders)
  mix: OrderMix;
  serviceMultipliers: ServiceMultipliers;
  hourlyWage: number;
  profitPerDrink: ProfitPerDrink;
  seed: number;
  horizonMinutes: number;
  warmupMinutes: number;

  // Play control
  playState: PlayState;
  runId: number;

  setOrdersPerHour: (v: number) => void;
  setBaristas: (v: number) => void;
  setServiceTimeMinutes: (v: number) => void;
  setMode: (m: Mode) => void;
  setSimSpeed: (v: number) => void;
  play: () => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  ordersPerHour: 100,
  baristas: 1,
  serviceTimeMinutes: 5,
  mode: "single",
  simSpeed: 10,

  mix: { ...DEFAULT_MIX },
  serviceMultipliers: { ...DEFAULT_SERVICE_MULTIPLIERS },
  hourlyWage: DEFAULT_HOURLY_WAGE,
  profitPerDrink: { ...DEFAULT_PROFIT_PER_DRINK },
  seed: (Math.random() * 2 ** 31) | 0,
  horizonMinutes: 60,
  warmupMinutes: 5,

  playState: "idle",
  runId: 0,

  setOrdersPerHour: (v) => set({ ordersPerHour: v }),
  setBaristas: (v) => set({ baristas: v }),
  setServiceTimeMinutes: (v) => set({ serviceTimeMinutes: v }),
  setMode: (m) => set({ mode: m }),
  setSimSpeed: (v) => set({ simSpeed: v }),
  play: () => set((s) => ({ playState: "running", runId: s.runId + 1 })),
  reset: () => set({ playState: "idle", runId: 0 }),
}));

/** Derive engine SimParams from the store's user-facing values. */
export function selectSimParams(s: AppState) {
  return {
    lambda: s.ordersPerHour / 60,
    mu: 1 / s.serviceTimeMinutes,
    c: s.mode === "single" ? 1 : s.baristas,
    mix: s.mix,
    serviceMultipliers: s.serviceMultipliers,
    arrivalMode: "poisson" as const,
    seed: s.seed,
    horizonMinutes: s.horizonMinutes,
    warmupMinutes: s.warmupMinutes,
  };
}
