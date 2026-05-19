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
import { profitPerHour } from "@/lib/sim/economics";
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
/*  Total-customers profit-crossover sweep                              */
/* ------------------------------------------------------------------ */

interface ProfitRow {
  totalCustomers: number;
  singleProfit: number;
  multiProfit: number;
  singleServed: number;
  multiServed: number;
  deltaProfit: number;
}

function sweepTotalCustomers(
  base: SimParams,
  hourlyWage: number,
  profitPerDrink: number,
): ProfitRow[] {
  const { walkin, pickup, delivery } = base.customersByType;
  const baseTotal = walkin + pickup + delivery;

  // Fall back to default ratio if all zeros
  const w = baseTotal === 0 ? 50 : walkin;
  const p = baseTotal === 0 ? 25 : pickup;
  const d = baseTotal === 0 ? 25 : delivery;
  const effectiveTotal = baseTotal === 0 ? 100 : baseTotal;

  const perBarista = Math.floor(base.horizonMinutes / base.serviceTimeMinutes);
  const maxCapacity = Math.max(base.baristas, base.baristasPerChannel * 3) * perBarista;
  const maxTotal = Math.max(effectiveTotal * 2, maxCapacity * 2, 150);
  const step = Math.max(5, Math.ceil(maxTotal / 25));

  const rows: ProfitRow[] = [];

  for (let total = 0; total <= maxTotal; total += step) {
    const ratio = total / effectiveTotal;
    const params: SimParams = {
      ...base,
      customersByType: {
        walkin: Math.round(w * ratio),
        pickup: Math.round(p * ratio),
        delivery: Math.round(d * ratio),
      },
    };

    const single = runSimulation({ ...params, mode: "single" });
    const multi = runSimulation({ ...params, mode: "multi" });

    const sProfit = profitPerHour(single.stats.drinksServed, single.stats.totalBaristas, profitPerDrink, hourlyWage);
    const mProfit = profitPerHour(multi.stats.drinksServed, multi.stats.totalBaristas, profitPerDrink, hourlyWage);

    rows.push({
      totalCustomers: total,
      singleProfit: sProfit,
      multiProfit: mProfit,
      singleServed: single.stats.drinksServed,
      multiServed: multi.stats.drinksServed,
      deltaProfit: mProfit - sProfit,
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
  const walkinPerHour = useAppStore((s) => s.walkinPerHour);
  const pickupPerHour = useAppStore((s) => s.pickupPerHour);
  const deliveryPerHour = useAppStore((s) => s.deliveryPerHour);
  const totalCustomers = walkinPerHour + pickupPerHour + deliveryPerHour;

  const cumData = useMemo(() => cumulativeRows(base), [base]);
  const profitData = useMemo(
    () => sweepTotalCustomers(base, hourlyWage, profitPerDrink),
    [base, hourlyWage, profitPerDrink],
  );

  // Run current-point sims for the decision box
  const currentPoint = useMemo(() => {
    const single = runSimulation({ ...base, mode: "single" });
    const multi = runSimulation({ ...base, mode: "multi" });
    const sProfit = profitPerHour(single.stats.drinksServed, single.stats.totalBaristas, profitPerDrink, hourlyWage);
    const mProfit = profitPerHour(multi.stats.drinksServed, multi.stats.totalBaristas, profitPerDrink, hourlyWage);
    return { single: single.stats, multi: multi.stats, sProfit, mProfit };
  }, [base, hourlyWage, profitPerDrink]);

  // Find crossover point from sweep data
  const crossover = useMemo(() => {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 1; i < profitData.length; i++) {
      const prev = profitData[i - 1]!;
      const cur = profitData[i]!;
      if (prev.deltaProfit <= 0 && cur.deltaProfit >= 0) {
        // Linear interpolation for exact crossover
        const t = prev.deltaProfit === cur.deltaProfit ? prev.totalCustomers
          : prev.totalCustomers + (cur.deltaProfit / (cur.deltaProfit - prev.deltaProfit)) * (cur.totalCustomers - prev.totalCustomers);
        if (t >= 0 && t <= profitData[profitData.length - 1]!.totalCustomers) {
          const dist = Math.abs(t - totalCustomers);
          if (dist < bestDist) {
            bestDist = dist;
            best = Math.round(t);
          }
        }
      }
    }
    return best;
  }, [profitData, totalCustomers]);

  return (
    <div className="space-y-5">
      <CumulativeChart data={cumData} />
      <ProfitCrossoverChart data={profitData} cursor={totalCustomers} />
      <DecisionBox
        totalCustomers={totalCustomers}
        currentPoint={currentPoint}
        crossover={crossover}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Cumulative drinks chart                                              */
/* ------------------------------------------------------------------ */

function CumulativeChart({ data }: { data: CumRow[] }) {
  return (
    <div>
      <div className="mb-1 text-xs opacity-80">Cumulative drinks completed over the hour</div>
      <div className="h-36 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="#ffffff10" />
            <XAxis dataKey="minute" stroke="#888" tick={{ fontSize: 10 }} label={{ value: "min", position: "insideBottomRight", offset: -2, fontSize: 10 }} />
            <YAxis stroke="#888" tick={{ fontSize: 10 }} width={36} />
            <Tooltip contentStyle={{ background: "#1e3932", border: "1px solid #ffffff20", color: "#fff" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="stepAfter" dataKey="single" name="single queue" stroke="#f87171" dot={false} />
            <Line type="stepAfter" dataKey="multi" name="per-type queues" stroke="#34d399" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Profit-crossover chart                                              */
/* ------------------------------------------------------------------ */

function ProfitCrossoverChart({ data, cursor }: { data: ProfitRow[]; cursor: number }) {
  return (
    <div>
      <div className="mb-1 text-xs opacity-80">Profit comparison vs total customers/hr</div>
      <div className="h-44 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ left: 0, right: 20, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="#ffffff10" />
            <XAxis dataKey="totalCustomers" stroke="#888" tick={{ fontSize: 10 }} label={{ value: "total customers / hr", position: "insideBottomRight", offset: -2, fontSize: 10 }} />
            <YAxis yAxisId="profit" stroke="#888" tick={{ fontSize: 10 }} width={44} domain={["auto", "auto"]} />
            <YAxis yAxisId="delta" orientation="right" stroke="#888" tick={{ fontSize: 10 }} width={36} domain={["auto", "auto"]} />
            <Tooltip contentStyle={{ background: "#1e3932", border: "1px solid #ffffff20", color: "#fff" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={0} yAxisId="delta" stroke="#666" strokeDasharray="2 2" />
            {cursor > 0 && <ReferenceLine x={cursor} yAxisId="profit" stroke="#ffb86b" strokeDasharray="3 3" />}
            <Line yAxisId="profit" type="monotone" dataKey="singleProfit" name="single queue profit" stroke="#f87171" dot={false} />
            <Line yAxisId="profit" type="monotone" dataKey="multiProfit" name="per-type queues profit" stroke="#34d399" dot={false} />
            <Line yAxisId="delta" type="monotone" dataKey="deltaProfit" name="ΔProfit (multi − single)" stroke="#a78bfa" dot={false} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Decision guide box                                                  */
/* ------------------------------------------------------------------ */

function DecisionBox({
  totalCustomers,
  currentPoint,
  crossover,
}: {
  totalCustomers: number;
  currentPoint: { single: { drinksServed: number; totalBaristas: number }; multi: { drinksServed: number; totalBaristas: number }; sProfit: number; mProfit: number };
  crossover: number;
}) {
  const { single, multi, sProfit, mProfit } = currentPoint;
  const better = sProfit > mProfit ? "single" : mProfit > sProfit ? "multi" : "tie";

  return (
    <div className="rounded-lg border border-[#ddd] bg-[#f8f6f3] px-3 py-2.5 text-xs space-y-2">
      <div className="flex items-center gap-2 font-semibold text-[#333]">
        <span>◆</span>
        <span>Decision Guide</span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span className="text-[#999]">Total customers</span>
        <span className="font-mono text-right">{totalCustomers} / hr</span>

        <span className="text-[#999]">Single queue</span>
        <span className="font-mono text-right">
          {single.drinksServed} drinks · {single.totalBaristas} staff · <span className={sProfit >= 0 ? "text-[#00704A]" : "text-[#cc3333]"}>${sProfit.toFixed(0)}/hr</span>
        </span>

        <span className="text-[#999]">Per-type queues</span>
        <span className="font-mono text-right">
          {multi.drinksServed} drinks · {multi.totalBaristas} staff · <span className={mProfit >= 0 ? "text-[#00704A]" : "text-[#cc3333]"}>${mProfit.toFixed(0)}/hr</span>
        </span>

        {better !== "tie" && (
          <>
            <span className="text-[#999]">Better option</span>
            <span className="font-mono text-right font-semibold text-[#333]">
              {better === "single" ? "Single queue" : "Per-type queues"}
              {" "}
              <span className="text-[#00704A]">
                (${Math.abs(sProfit - mProfit).toFixed(0)}/hr more)
              </span>
            </span>
          </>
        )}

        {crossover > 0 && (
          <>
            <span className="text-[#999]">Profit crossover at</span>
            <span className="font-mono text-right">~{crossover} customers/hr</span>
          </>
        )}
      </div>

      {crossover > 0 && (
        <div className="pt-1 text-[11px] leading-tight text-[#666] border-t border-[#ddd]">
          {totalCustomers < crossover
            ? "Below the crossover: per-type queues are more profitable due to lower labor cost."
            : "Above the crossover: single queue is more profitable due to higher serving capacity."}
        </div>
      )}
    </div>
  );
}
