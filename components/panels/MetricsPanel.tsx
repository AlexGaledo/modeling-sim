"use client";

import { useSim } from "@/lib/hooks/useSim";
import { economicsFromStats } from "@/lib/sim/economics";
import { mmc, type QueueingMetrics } from "@/lib/sim/queueing";
import type { SimParams, SimStats } from "@/lib/sim/types";
import { selectSimParams, useAppStore } from "@/lib/store";
import ComparePanel from "./ComparePanel";

export default function MetricsPanel() {
  const result = useSim();
  const params = useAppStore(selectSimParams);
  const mode = useAppStore((s) => s.mode);
  const theory = mmc(params.lambda, params.mu, params.c);

  return (
    <div className="space-y-3 text-sm">
      <h2 className="text-sm font-semibold text-[#555]">Metrics</h2>

      {mode === "compare" ? (
        <ComparePanel />
      ) : !result ? (
        <p className="text-xs text-[#999]">Press Play to run simulation.</p>
      ) : (
        <ResultView stats={result.stats} theory={theory} params={params} />
      )}
    </div>
  );
}

function ResultView({
  stats,
  theory,
  params,
}: {
  stats: SimStats;
  theory: QueueingMetrics;
  params: SimParams;
}) {
  const baristas = useAppStore((s) => s.baristas);
  const hourlyWage = useAppStore((s) => s.hourlyWage);
  const profitPerDrink = useAppStore((s) => s.profitPerDrink);
  const econ = economicsFromStats(stats, { baristas, hourlyWage, profitPerDrink });

  return (
    <>
      <div className="flex items-baseline justify-between">
        <span />
        {stats.unstable && (
          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
            UNSTABLE (ρ = {stats.rho.toFixed(2)})
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Kpi label="Utilization ρ" value={stats.rho.toFixed(2)} />
        <Kpi label="Avg time/order" value={`${stats.meanW.toFixed(1)} min`} highlight />
        <Kpi label="Wq (sampled)" value={`${stats.meanWq.toFixed(1)} min`} />
        <Kpi label="Wq (theory)" value={theory.unstable ? "—" : `${theory.Wq.toFixed(1)} min`} />
        <Kpi label="Max queue" value={String(stats.maxQueueLength)} />
        <Kpi label="Orders served" value={String(stats.ordersServed)} />
        <Kpi label="Revenue/hr" value={`$${econ.revenuePerHour.toFixed(0)}`} />
        <Kpi label="Profit/hr" value={`$${econ.profitPerHour.toFixed(0)}`} highlight />
      </div>

      <div className="col-span-2 space-y-1 pt-1">
        <div className="text-[10px] uppercase tracking-wide text-[#999]">Served by type</div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <span><span className="text-[#ff6b6b]">●</span> Walk-in {stats.drinksServedByType.walkin}</span>
          <span><span className="text-[#ffd93d]">●</span> Pickup {stats.drinksServedByType.pickup}</span>
          <span><span className="text-[#6bcbff]">●</span> Delivery {stats.drinksServedByType.delivery}</span>
        </div>
      </div>

      {!theory.unstable && stats.meanWq > 0 && (
        <p className="text-xs text-[#999]">
          Δ Wq {pct(stats.meanWq, theory.Wq)} · W {pct(stats.meanW, theory.W)}
        </p>
      )}
    </>
  );
}

function Kpi({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-md border px-2.5 py-1.5 ${
        highlight ? "border-[#00704A]/30 bg-[#00704A]/10" : "border-[#ddd] bg-[#f8f6f3]"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wide text-[#999]">{label}</div>
      <div className="font-mono text-sm text-[#333]">{value}</div>
    </div>
  );
}

function pct(sampled: number, theory: number): string {
  if (!Number.isFinite(theory) || theory === 0) return "—";
  const d = ((sampled - theory) / theory) * 100;
  return `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`;
}
