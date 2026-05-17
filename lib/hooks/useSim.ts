"use client";

import { useEffect, useMemo } from "react";
import { runSimulation, type RunResult } from "@/lib/sim/engine";
import { selectSimParams, useAppStore } from "@/lib/store";
import type { Customer, OrderType, SimStats } from "@/lib/sim/types";

/* ------------------------------------------------------------------ */
/*  Result types                                                        */
/* ------------------------------------------------------------------ */

export interface ChannelRunResult {
  type: OrderType;
  customers: Customer[];
  stats: SimStats;
}

export interface SingleRunResult {
  mode: "single";
  customers: Customer[];
  stats: SimStats;
}

export interface MultiRunResult {
  mode: "multi";
  customers: Customer[];
  stats: SimStats;
  channels: ChannelRunResult[];
}

export type SimResult = SingleRunResult | MultiRunResult | null;

/* ------------------------------------------------------------------ */
/*  Combine multiple channel stats into one aggregate                   */
/* ------------------------------------------------------------------ */

export function combineStats(stats: SimStats[]): SimStats {
  const served = stats.reduce((s, st) => s + st.ordersServed, 0);
  const unfinished = stats.reduce((s, st) => s + st.ordersUnfinished, 0);
  const wqSum = stats.reduce((s, st) => s + st.meanWq * st.ordersServed, 0);
  const wSum = stats.reduce((s, st) => s + st.meanW * st.ordersServed, 0);
  return {
    rho: stats.reduce((s, st) => s + st.rho, 0) / stats.length,
    unstable: stats.some((st) => st.unstable),
    ordersServed: served,
    ordersUnfinished: unfinished,
    meanWq: served > 0 ? wqSum / served : 0,
    meanW: served > 0 ? wSum / served : 0,
    meanLq: stats.reduce((s, st) => s + st.meanLq, 0),
    maxQueueLength: Math.max(...stats.map((st) => st.maxQueueLength)),
    measuredMinutes: stats[0]?.measuredMinutes ?? 0,
    utilization: stats.flatMap((st) => st.utilization),
    drinksServedByType: {
      walkin: stats.reduce((s, st) => s + st.drinksServedByType.walkin, 0),
      pickup: stats.reduce((s, st) => s + st.drinksServedByType.pickup, 0),
      delivery: stats.reduce((s, st) => s + st.drinksServedByType.delivery, 0),
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

export function useSim(): SimResult {
  const runId = useAppStore((s) => s.runId);
  const playState = useAppStore((s) => s.playState);
  const mode = useAppStore((s) => s.mode);
  const params = useAppStore(selectSimParams);
  const baristasPerChannel = useAppStore((s) => s.baristasPerChannel);
  const walkinPerHour = useAppStore((s) => s.walkinPerHour);
  const pickupPerHour = useAppStore((s) => s.pickupPerHour);
  const deliveryPerHour = useAppStore((s) => s.deliveryPerHour);

  const result = useMemo(() => {
    if (runId === 0) return null;

    if (mode === "single") {
      console.log(`[SIM] Single-channel, c=${params.c}, λ=${params.lambda.toFixed(4)}/min, μ=${params.mu.toFixed(4)}/min`);
      const r = runSimulation(params);
      console.log(`[SIM] Single-channel complete: ${r.customers.length} customers`);
      return { mode: "single" as const, customers: r.customers, stats: r.stats };
    }

    // Multi-channel — one sim per order type with pure mix & dedicated servers
    const channels: ChannelRunResult[] = [];
    const types: OrderType[] = ["walkin", "pickup", "delivery"];
    const rates = [walkinPerHour, pickupPerHour, deliveryPerHour];
    const totalRate = rates.reduce((s, r) => s + r, 0);

    types.forEach((type, i) => {
      const rate = rates[i] ?? 0;
      if (rate <= 0) return;
      const p = {
        ...params,
        lambda: rate / 60,
        mix: { walkin: type === "walkin" ? 1 : 0, pickup: type === "pickup" ? 1 : 0, delivery: type === "delivery" ? 1 : 0 },
        c: baristasPerChannel,
        seed: params.seed + i + 1,
      };
      const r = runSimulation(p);
      console.log(`[SIM] Multi-channel ${type}: λ=${rate}/hr (${p.lambda.toFixed(4)}/min), c=${p.c}, served=${r.stats.ordersServed}`);
      channels.push({ type, customers: r.customers, stats: r.stats });
    });

    // Re-number customer IDs so they're unique across channels
    let id = 0;
    const allCustomers = channels.flatMap((ch) =>
      ch.customers.map((c) => ({ ...c, id: id++ })),
    );

    const stats = combineStats(channels.map((ch) => ch.stats));
    console.log(`[SIM] Multi-channel complete: ${allCustomers.length} customers across ${channels.length} channels`);
    return { mode: "multi" as const, customers: allCustomers, stats, channels };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, mode, walkinPerHour, pickupPerHour, deliveryPerHour, baristasPerChannel]);

  useEffect(() => {
    if (result && playState === "running") {
      console.log("[SIM] Setting playState -> done");
      useAppStore.setState({ playState: "done" });
    }
  }, [result, playState]);

  return result;
}
