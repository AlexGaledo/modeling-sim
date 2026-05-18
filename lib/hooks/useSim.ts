"use client";

import { useMemo } from "react";
import { runSimulation } from "@/lib/sim/engine";
import { useAppStore } from "@/lib/store";
import type { Customer, OrderType, SimParams, SimStats } from "@/lib/sim/types";
import type { SimMode } from "@/lib/sim/types";

export interface ChannelRunResult {
  type: OrderType;
  customers: Customer[];
  stats: ChannelStats;
}

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

export type SimResult = SingleRunResult | MultiRunResult;

export function useSim(): SimResult {
  const walkinPerHour = useAppStore((s) => s.walkinPerHour);
  const pickupPerHour = useAppStore((s) => s.pickupPerHour);
  const deliveryPerHour = useAppStore((s) => s.deliveryPerHour);
  const baristas = useAppStore((s) => s.baristas);
  const baristasPerChannel = useAppStore((s) => s.baristasPerChannel);
  const serviceTimeMinutes = useAppStore((s) => s.serviceTimeMinutes);
  const horizonMinutes = useAppStore((s) => s.horizonMinutes);
  const mode = useAppStore((s) => s.mode);

  return useMemo<SimResult>(() => {
    const simMode: SimMode = mode === "multi" ? "multi" : "single";
    const params: SimParams = {
      serviceTimeMinutes,
      baristas,
      baristasPerChannel,
      customersByType: {
        walkin: walkinPerHour,
        pickup: pickupPerHour,
        delivery: deliveryPerHour,
      },
      horizonMinutes,
      mode: simMode,
    };
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
  }, [
    walkinPerHour,
    pickupPerHour,
    deliveryPerHour,
    baristas,
    baristasPerChannel,
    serviceTimeMinutes,
    horizonMinutes,
    mode,
  ]);
}
