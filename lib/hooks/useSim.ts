"use client";

import { useEffect, useMemo } from "react";
import { runSimulation } from "@/lib/sim/engine";
import { selectSimParams, useAppStore } from "@/lib/store";
import type { Customer, OrderType, SimStats } from "@/lib/sim/types";

export interface ChannelRunResult {
  type: OrderType;
  customers: Customer[];
  stats: ChannelStats;
}

/** Per-channel slice of the multi-mode stats. */
export interface ChannelStats {
  drinksServed: number;
  customersTotal: number;
  customersUnserved: number;
  idleBaristaMinutes: number;
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

export function useSim(): SimResult {
  const runId = useAppStore((s) => s.runId);
  const playState = useAppStore((s) => s.playState);
  const params = useAppStore(selectSimParams);

  const result = useMemo<SimResult>(() => {
    if (runId === 0) return null;
    const r = runSimulation(params);

    if (params.mode === "single") {
      return { mode: "single", customers: r.customers, stats: r.stats };
    }

    const types: OrderType[] = ["walkin", "pickup", "delivery"];
    const channels: ChannelRunResult[] = types.map((type) => {
      const channelCustomers = r.customers.filter((c) => c.orderType === type);
      const drinksServed = r.stats.drinksServedByType[type];
      const customersTotal = params.customersByType[type];
      const idle = r.stats.idleBaristaMinutesByChannel?.[type] ?? 0;
      return {
        type,
        customers: channelCustomers,
        stats: {
          drinksServed,
          customersTotal,
          customersUnserved: customersTotal - drinksServed,
          idleBaristaMinutes: idle,
        },
      };
    });

    return { mode: "multi", customers: r.customers, stats: r.stats, channels };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  useEffect(() => {
    if (result && playState === "running") {
      useAppStore.setState({ playState: "done" });
    }
  }, [result, playState]);

  return result;
}
