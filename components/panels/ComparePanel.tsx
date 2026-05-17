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
import { economicsFromStats } from "@/lib/sim/economics";
import { runSimulation } from "@/lib/sim/engine";
import { selectSimParams, useAppStore } from "@/lib/store";

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
  const hourlyWage = useAppStore((s) => s.hourlyWage);
  const profitPerDrink = useAppStore((s) => s.profitPerDrink);

  const data = useMemo<Row[]>(() => {
    const rows: Row[] = [];
    for (let load = SWEEP_MIN; load <= SWEEP_MAX; load += SWEEP_STEP) {
      const lambda = load / 60;
      const single = runSimulation({ ...base, lambda, c: 1 });
      const multi = runSimulation({ ...base, lambda, c: baristas });
      const eS = economicsFromStats(single.stats, { baristas: 1, hourlyWage, profitPerDrink });
      const eM = economicsFromStats(multi.stats, { baristas, hourlyWage, profitPerDrink });
      rows.push({
        load,
        singleProfit: eS.profitPerHour,
        multiProfit: eM.profitPerHour,
        singleAvgTime: single.stats.unstable ? null : single.stats.meanW,
        multiAvgTime: multi.stats.unstable ? null : multi.stats.meanW,
      });
    }
    return rows;
  }, [base, baristas, hourlyWage, profitPerDrink]);

  const currentLoad = base.lambda * 60;

  return (
    <div className="space-y-4">
      <Chart title="Profit per hour vs load" dataKey1="singleProfit" dataKey2="multiProfit" data={data} cursor={currentLoad} unit="$" />
      <Chart title="Avg time per order vs load (gap = unstable)" dataKey1="singleAvgTime" dataKey2="multiAvgTime" data={data} cursor={currentLoad} unit="min" />
      <p className="text-xs opacity-60">
        Same seed across single (c=1) and multi (c={baristas}); single-channel breaks at ρ ≥ 1 (no
        line where unstable).
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
            <Line type="monotone" dataKey={dataKey1 as string} name="single (c=1)" stroke="#f87171" dot={false} connectNulls={false} />
            <Line type="monotone" dataKey={dataKey2 as string} name="multi" stroke="#34d399" dot={false} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
