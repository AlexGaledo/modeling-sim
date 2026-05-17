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
import { economicsFromStats } from "@/lib/sim/economics";
import type { SimParams } from "@/lib/sim/types";

interface Row {
  load: number;
  singleProfit: number;
  multiProfit: number;
  singleAvgTime: number | null;
  multiAvgTime: number | null;
}

const SWEEP_MIN = 20;
const SWEEP_MAX = 300;
const SWEEP_STEP = 20;

export default function ComparePanel() {
  const base = useAppStore(selectSimParams);
  const baristas = useAppStore((s) => s.baristas);
  const baristasPerChannel = useAppStore((s) => s.baristasPerChannel);
  const hourlyWage = useAppStore((s) => s.hourlyWage);
  const profitPerDrink = useAppStore((s) => s.profitPerDrink);
  const walkinPct = base.mix.walkin;
  const pickupPct = base.mix.pickup;
  const deliveryPct = base.mix.delivery;
  const activeChannels = [walkinPct, pickupPct, deliveryPct].filter((p) => p > 0).length;

  const data = useMemo<Row[]>(() => {
    const rows: Row[] = [];
    for (let load = SWEEP_MIN; load <= SWEEP_MAX; load += SWEEP_STEP) {
      const lambda = load / 60;

      // Single-channel: one mixed queue, c baristas
      const single = runSimulation({ ...base, lambda, c: baristas });

      // Multi-channel: per-type queues, each with baristasPerChannel servers
      const multiChannels = [
        walkinPct > 0 ? runSimulation({ ...base, lambda: lambda * walkinPct, c: baristasPerChannel, mix: { walkin: 1, pickup: 0, delivery: 0 }, seed: base.seed + 1 } satisfies SimParams) : null,
        pickupPct > 0 ? runSimulation({ ...base, lambda: lambda * pickupPct, c: baristasPerChannel, mix: { walkin: 0, pickup: 1, delivery: 0 }, seed: base.seed + 2 } satisfies SimParams) : null,
        deliveryPct > 0 ? runSimulation({ ...base, lambda: lambda * deliveryPct, c: baristasPerChannel, mix: { walkin: 0, pickup: 0, delivery: 1 }, seed: base.seed + 3 } satisfies SimParams) : null,
      ].filter((r): r is NonNullable<typeof r> => r !== null);

      const multiStats = combineStats(multiChannels.map((r) => r.stats));

      const eS = economicsFromStats(single.stats, { baristas, hourlyWage, profitPerDrink });
      const eM = economicsFromStats(multiStats, { baristas: baristasPerChannel * activeChannels, hourlyWage, profitPerDrink });

      rows.push({
        load,
        singleProfit: eS.profitPerHour,
        multiProfit: eM.profitPerHour,
        singleAvgTime: single.stats.unstable ? null : single.stats.meanW,
        multiAvgTime: multiStats.unstable ? null : multiStats.meanW,
      });
    }
    return rows;
  }, [base, baristas, baristasPerChannel, hourlyWage, profitPerDrink, walkinPct, pickupPct, deliveryPct, activeChannels]);

  const currentLoad = base.lambda * 60;

  return (
    <div className="space-y-4">
      <Chart title="Profit per hour vs load" dataKey1="singleProfit" dataKey2="multiProfit" data={data} cursor={currentLoad} unit="$" />
      <Chart title="Avg time per order vs load (gap = unstable)" dataKey1="singleAvgTime" dataKey2="multiAvgTime" data={data} cursor={currentLoad} unit="min" />
      <p className="text-xs opacity-60">
        Single queue (c={baristas}, all types mixed) vs per-type queues (c={baristasPerChannel} × {activeChannels} channels).
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
  unit,
}: {
  title: string;
  dataKey1: keyof Row;
  dataKey2: keyof Row;
  data: Row[];
  cursor: number;
  unit: string;
}) {
  return (
    <div>
      <div className="mb-1 text-xs opacity-80">{title}</div>
      <div className="h-40 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="#ffffff10" />
            <XAxis dataKey="load" stroke="#f1ece4" tick={{ fontSize: 10 }} />
            <YAxis stroke="#f1ece4" tick={{ fontSize: 10 }} width={50} unit={unit} />
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
