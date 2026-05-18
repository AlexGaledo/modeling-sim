"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { runSimulation } from "@/lib/sim/engine";
import { selectSimParams, useAppStore } from "@/lib/store";
import { combineStats } from "@/lib/hooks/useSim";
import type { SimParams } from "@/lib/sim/types";

interface Row {
  totalCustomers: number;
  singleServed: number;
  multiServed: number;
}

const SWEEP_MIN = 30;
const SWEEP_MAX = 300;
const SWEEP_STEP = 30;

export default function ComparePanel() {
  const base = useAppStore(selectSimParams);
  const baristas = useAppStore((s) => s.baristas);
  const baristasPerChannel = useAppStore((s) => s.baristasPerChannel);
  const walkinPct = base.mix.walkin;
  const pickupPct = base.mix.pickup;
  const deliveryPct = base.mix.delivery;
  const activeChannels = [walkinPct, pickupPct, deliveryPct].filter((p) => p > 0).length;

  const data = useMemo<Row[]>(() => {
    const rows: Row[] = [];
    for (let total = SWEEP_MIN; total <= SWEEP_MAX; total += SWEEP_STEP) {
      const lambda = total / 60;

      // Single-channel: one mixed queue, c baristas
      const single = runSimulation({ ...base, lambda, c: baristas });

      // Multi-channel: per-type queues
      const multiChannels = [
        walkinPct > 0 ? runSimulation({ ...base, lambda: lambda * walkinPct, c: baristasPerChannel, mix: { walkin: 1, pickup: 0, delivery: 0 }, seed: base.seed + 1 } satisfies SimParams) : null,
        pickupPct > 0 ? runSimulation({ ...base, lambda: lambda * pickupPct, c: baristasPerChannel, mix: { walkin: 0, pickup: 1, delivery: 0 }, seed: base.seed + 2 } satisfies SimParams) : null,
        deliveryPct > 0 ? runSimulation({ ...base, lambda: lambda * deliveryPct, c: baristasPerChannel, mix: { walkin: 0, pickup: 0, delivery: 1 }, seed: base.seed + 3 } satisfies SimParams) : null,
      ].filter((r): r is NonNullable<typeof r> => r !== null);

      const multiStats = combineStats(multiChannels.map((r) => r.stats));

      rows.push({
        totalCustomers: total,
        singleServed: single.stats.ordersServed,
        multiServed: multiStats.ordersServed,
      });
    }
    return rows;
  }, [base, baristas, baristasPerChannel, walkinPct, pickupPct, deliveryPct]);

  const currentTotal = useAppStore((s) => s.walkinPerHour + s.pickupPerHour + s.deliveryPerHour);

  return (
    <div className="space-y-4">
      <Chart title="Customers served in 1 hour vs total arriving" dataKey1="singleServed" dataKey2="multiServed" data={data} cursor={currentTotal} />
      <p className="text-xs opacity-60">
        Single queue (c={baristas}, all types mixed) vs per-type queues (c={baristasPerChannel} × {activeChannels} channels).
        Higher line = more customers served within the hour.
      </p>
    </div>
  );
}

function Chart({
  title,
  dataKey1,
  dataKey2,
  data,
  cursor,
}: {
  title: string;
  dataKey1: keyof Row;
  dataKey2: keyof Row;
  data: Row[];
  cursor: number;
}) {
  return (
    <div>
      <div className="mb-1 text-xs opacity-80">{title}</div>
      <div className="h-40 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="#ffffff10" />
            <XAxis dataKey="totalCustomers" stroke="#f1ece4" tick={{ fontSize: 10 }} />
            <YAxis stroke="#f1ece4" tick={{ fontSize: 10 }} width={50} />
            <Tooltip contentStyle={{ background: "#1e3932", border: "1px solid #ffffff20" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine x={cursor} stroke="#ffb86b" strokeDasharray="3 3" />
            <Line type="monotone" dataKey={dataKey1 as string} name="single queue" stroke="#f87171" dot={false} connectNulls={false} />
            <Line type="monotone" dataKey={dataKey2 as string} name="per-type queues" stroke="#34d399" dot={false} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
