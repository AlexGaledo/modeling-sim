"use client";

import { useSim, type ChannelRunResult } from "@/lib/hooks/useSim";
import { economicsFromStats } from "@/lib/sim/economics";
import { mmc, type QueueingMetrics } from "@/lib/sim/queueing";
import type { SimParams, SimStats } from "@/lib/sim/types";
import { useAppStore } from "@/lib/store";
import ComparePanel from "./ComparePanel";

export default function MetricsPanel() {
  const result = useSim();
  const mode = useAppStore((s) => s.mode);

  return (
    <div className="space-y-3 text-sm">
      <h2 className="text-sm font-semibold text-[#555]">Metrics</h2>

      {mode === "compare" ? (
        <ComparePanel />
      ) : !result ? (
        <p className="text-xs text-[#999]">Press Play to run simulation.</p>
      ) : result.mode === "multi" ? (
        <MultiResultView result={result} />
      ) : (
        <SingleResultView stats={result.stats} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single-channel result (one mixed queue)                              */
/* ------------------------------------------------------------------ */

function SingleResultView({ stats }: { stats: SimStats }) {
  const baristas = useAppStore((s) => s.baristas);
  const hourlyWage = useAppStore((s) => s.hourlyWage);
  const profitPerDrink = useAppStore((s) => s.profitPerDrink);
  const econ = economicsFromStats(stats, { baristas, hourlyWage, profitPerDrink });
  const totalRate = useAppStore((s) => s.walkinPerHour + s.pickupPerHour + s.deliveryPerHour);
  const mu = 1 / useAppStore((s) => s.serviceTimeMinutes);
  const theory = mmc(totalRate / 60, mu, baristas);

  return (
    <>
      <ChannelKpiGrid stats={stats} theory={theory} label="Single queue — all types mixed" />
      <div className="grid grid-cols-2 gap-2 pt-1">
        <Kpi label="Revenue/hr" value={`$${econ.revenuePerHour.toFixed(0)}`} />
        <Kpi label="Profit/hr" value={`$${econ.profitPerHour.toFixed(0)}`} highlight />
      </div>
      <ServedByType stats={stats} />
      {!theory.unstable && stats.meanWq > 0 && (
        <p className="text-xs text-[#999]">
          Δ Wq {pct(stats.meanWq, theory.Wq)} · W {pct(stats.meanW, theory.W)}
        </p>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Multi-channel result (per-type queues)                               */
/* ------------------------------------------------------------------ */

function MultiResultView({ result }: { result: import("@/lib/hooks/useSim").MultiRunResult }) {
  const baristas = useAppStore((s) => s.baristasPerChannel);
  const hourlyWage = useAppStore((s) => s.hourlyWage);
  const profitPerDrink = useAppStore((s) => s.profitPerDrink);
  const mu = 1 / useAppStore((s) => s.serviceTimeMinutes);

  // Combined economics using total baristas across all channels
  const activeChannels = result.channels.filter((ch) => ch.stats.ordersServed > 0 || ch.stats.ordersUnfinished > 0);
  const econ = economicsFromStats(result.stats, {
    baristas: baristas * activeChannels.length,
    hourlyWage,
    profitPerDrink,
  });

  return (
    <>
      {/* Combined totals */}
      <div className="rounded-md border border-[#00704A]/20 bg-[#00704A]/5 px-2.5 py-1.5">
        <div className="text-[10px] uppercase tracking-wide text-[#999]">Combined</div>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <Kpi label="Orders served" value={String(result.stats.ordersServed)} />
          <Kpi label="Avg time/order" value={`${result.stats.meanW.toFixed(1)} min`} highlight />
          <Kpi label="Wq" value={`${result.stats.meanWq.toFixed(1)} min`} />
          <Kpi label="Revenue/hr" value={`$${econ.revenuePerHour.toFixed(0)}`} />
        </div>
      </div>

      {/* Per-channel KPIs */}
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-wide text-[#999]">Per channel</div>
        {result.channels.map((ch) => (
          <ChannelCard key={ch.type} channel={ch} mu={mu} baristasPerChannel={baristas} />
        ))}
      </div>
    </>
  );
}

function ChannelCard({ channel, mu, baristasPerChannel }: { channel: ChannelRunResult; mu: number; baristasPerChannel: number }) {
  const s = channel.stats;
  const rate = s.ordersServed + s.ordersUnfinished;
  const theory = mmc(s.ordersServed > 0 ? rate / s.measuredMinutes : 0, mu, baristasPerChannel);
  const color = channel.type === "walkin" ? "#ff6b6b" : channel.type === "pickup" ? "#ffd93d" : "#6bcbff";

  return (
    <div className="rounded-md border border-[#ddd] bg-[#f8f6f3] px-2.5 py-1.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color }}>
        <span>●</span>
        <span className="capitalize">{channel.type}</span>
        {s.unstable && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] text-red-600">UNSTABLE</span>}
      </div>
      <div className="mt-1 grid grid-cols-3 gap-1">
        <MiniKpi label="Served" value={String(s.ordersServed)} />
        <MiniKpi label="Wq" value={`${s.meanWq.toFixed(1)} min`} />
        <MiniKpi label="ρ" value={s.rho.toFixed(2)} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared components                                                   */
/* ------------------------------------------------------------------ */

function ChannelKpiGrid({ stats, theory, label }: { stats: SimStats; theory: QueueingMetrics; label: string }) {
  return (
    <>
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-wide text-[#999]">{label}</span>
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
      </div>
    </>
  );
}

function ServedByType({ stats }: { stats: SimStats }) {
  return (
    <div className="col-span-2 space-y-1 pt-1">
      <div className="text-[10px] uppercase tracking-wide text-[#999]">Served by type</div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <span><span className="text-[#ff6b6b]">●</span> Walk-in {stats.drinksServedByType.walkin}</span>
        <span><span className="text-[#ffd93d]">●</span> Pickup {stats.drinksServedByType.pickup}</span>
        <span><span className="text-[#6bcbff]">●</span> Delivery {stats.drinksServedByType.delivery}</span>
      </div>
    </div>
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

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wide text-[#999]">{label}</div>
      <div className="font-mono text-xs text-[#333]">{value}</div>
    </div>
  );
}

function pct(sampled: number, theory: number): string {
  if (!Number.isFinite(theory) || theory === 0) return "—";
  const d = ((sampled - theory) / theory) * 100;
  return `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`;
}
