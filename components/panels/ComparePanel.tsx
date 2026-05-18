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
import { compareScenarios } from "@/lib/sim/economics";
import { selectSimParams, useAppStore } from "@/lib/store";
import type { SimParams } from "@/lib/sim/types";

/* ------------------------------------------------------------------ */
/*  Cumulative-drinks step chart (revised §8)                           */
/* ------------------------------------------------------------------ */

interface CumRow {
  minute: number;
  single: number;
  multi: number;
}

function cumulativeRows(params: SimParams): CumRow[] {
  const single = runSimulation({ ...params, mode: "single" });
  const multi = runSimulation({ ...params, mode: "multi" });

  const rows: CumRow[] = [];
  for (let t = 0; t <= params.horizonMinutes; t++) {
    const s = single.customers.filter((c) => (c.departureTime ?? Infinity) <= t).length;
    const m = multi.customers.filter((c) => (c.departureTime ?? Infinity) <= t).length;
    rows.push({ minute: t, single: s, multi: m });
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/*  Walk-in load sweep                                                  */
/* ------------------------------------------------------------------ */

interface SweepRow {
  walkin: number;
  singleServed: number;
  multiServed: number;
  deltaProfit: number;
}

function sweepWalkin(base: SimParams, hourlyWage: number, profitPerDrink: number): SweepRow[] {
  const rows: SweepRow[] = [];
  for (let walkin = 0; walkin <= 100; walkin += 10) {
    const params: SimParams = {
      ...base,
      customersByType: { ...base.customersByType, walkin },
    };
    const single = runSimulation({ ...params, mode: "single" });
    const multi = runSimulation({ ...params, mode: "multi" });
    const cmp = compareScenarios({
      single: single.stats,
      multi: multi.stats,
      hourlyWage,
      profitPerDrink,
    });
    rows.push({
      walkin,
      singleServed: single.stats.drinksServed,
      multiServed: multi.stats.drinksServed,
      deltaProfit: cmp.deltaProfit,
    });
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/*  Panel                                                               */
/* ------------------------------------------------------------------ */

export default function ComparePanel() {
  const base = useAppStore(selectSimParams);
  const hourlyWage = useAppStore((s) => s.hourlyWage);
  const profitPerDrink = useAppStore((s) => s.profitPerDrink);
  const walkinCursor = useAppStore((s) => s.walkinPerHour);

  const cumData = useMemo(() => cumulativeRows(base), [base]);
  const sweepData = useMemo(
    () => sweepWalkin(base, hourlyWage, profitPerDrink),
    [base, hourlyWage, profitPerDrink],
  );

  return (
    <div className="space-y-5">
      <Chart
        title="Cumulative drinks completed over the hour"
        xKey="minute"
        xLabel="min"
        data={cumData as unknown as Array<Record<string, number>>}
        cursor={null}
      />
      <Chart
        title="Drinks served vs walk-in count (pickup & delivery held fixed)"
        xKey="walkin"
        xLabel="walkin"
        data={sweepData as unknown as Array<Record<string, number>>}
        cursor={walkinCursor}
      />
      <DeltaChart data={sweepData} cursor={walkinCursor} />
    </div>
  );
}

function Chart({
  title,
  xKey,
  xLabel,
  data,
  cursor,
}: {
  title: string;
  xKey: string;
  xLabel: string;
  data: Array<Record<string, number>>;
  cursor: number | null;
}) {
  const singleKey = xKey === "minute" ? "single" : "singleServed";
  const multiKey = xKey === "minute" ? "multi" : "multiServed";
  return (
    <div>
      <div className="mb-1 text-xs opacity-80">{title}</div>
      <div className="h-40 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="#ffffff10" />
            <XAxis dataKey={xKey} stroke="#888" tick={{ fontSize: 10 }} label={{ value: xLabel, position: "insideBottomRight", offset: -2, fontSize: 10 }} />
            <YAxis stroke="#888" tick={{ fontSize: 10 }} width={40} />
            <Tooltip contentStyle={{ background: "#1e3932", border: "1px solid #ffffff20", color: "#fff" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {cursor !== null && <ReferenceLine x={cursor} stroke="#ffb86b" strokeDasharray="3 3" />}
            <Line type="stepAfter" dataKey={singleKey} name="single queue" stroke="#f87171" dot={false} />
            <Line type="stepAfter" dataKey={multiKey} name="per-type queues" stroke="#34d399" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DeltaChart({ data, cursor }: { data: SweepRow[]; cursor: number }) {
  return (
    <div>
      <div className="mb-1 text-xs opacity-80">ΔProfit (multi − single) vs walk-in count</div>
      <div className="h-32 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="#ffffff10" />
            <XAxis dataKey="walkin" stroke="#888" tick={{ fontSize: 10 }} />
            <YAxis stroke="#888" tick={{ fontSize: 10 }} width={40} />
            <Tooltip contentStyle={{ background: "#1e3932", border: "1px solid #ffffff20", color: "#fff" }} />
            <ReferenceLine y={0} stroke="#888" />
            <ReferenceLine x={cursor} stroke="#ffb86b" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="deltaProfit" name="ΔProfit ($/hr)" stroke="#a78bfa" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
