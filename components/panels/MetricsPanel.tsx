"use client";

import { useSim, type ChannelRunResult } from "@/lib/hooks/useSim";
import type { SimStats } from "@/lib/sim/types";
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
/*  Throughput banner — primary metric                                   */
/* ------------------------------------------------------------------ */

function ThroughputBanner({ served, total, label }: { served: number; total: number; label: string }) {
  const pct = total > 0 ? ((served / total) * 100).toFixed(0) : "—";
  const color = served >= total ? "#00704A" : served >= total * 0.75 ? "#e68a00" : "#cc3333";
  return (
    <div className="rounded-lg border-2 px-3 py-2 text-center" style={{ borderColor: color, backgroundColor: `${color}0d` }}>
      <div className="text-[10px] uppercase tracking-wide" style={{ color }}>{label}</div>
      <div className="mt-0.5 font-mono text-lg font-bold" style={{ color }}>
        {served} / {total}
      </div>
      <div className="font-mono text-xs" style={{ color: `${color}cc` }}>
        {pct}% served in 1 hour
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single-channel result                                                */
/* ------------------------------------------------------------------ */

function SingleResultView({ stats }: { stats: SimStats }) {
  const total = useAppStore((s) => s.walkinPerHour + s.pickupPerHour + s.deliveryPerHour);
  const arrived = stats.ordersServed + stats.ordersUnfinished;

  return (
    <>
      <ThroughputBanner served={stats.ordersServed} total={total} label="SINGLE QUEUE" />

      <div className="grid grid-cols-2 gap-2">
        <Kpi label="Orders arrived" value={String(arrived)} />
        <Kpi label="Orders served" value={String(stats.ordersServed)} highlight />
        <Kpi label="Unfinished" value={String(stats.ordersUnfinished)} />
        <Kpi label="Max queue" value={String(stats.maxQueueLength)} />
        <Kpi label="Avg wait (Wq)" value={`${stats.meanWq.toFixed(1)} min`} />
        <Kpi label="Avg time in sys" value={`${stats.meanW.toFixed(1)} min`} />
      </div>

      <ServedByType stats={stats} />

      {stats.unstable && (
        <span className="inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
          UNSTABLE (ρ = {stats.rho.toFixed(2)})
        </span>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Multi-channel result                                                 */
/* ------------------------------------------------------------------ */

function MultiResultView({ result }: { result: import("@/lib/hooks/useSim").MultiRunResult }) {
  const total = useAppStore((s) => s.walkinPerHour + s.pickupPerHour + s.deliveryPerHour);

  return (
    <>
      <ThroughputBanner served={result.stats.ordersServed} total={total} label="PER-TYPE QUEUES" />

      {/* Per-channel cards */}
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-wide text-[#999]">Per channel</div>
        {result.channels.map((ch) => (
          <ChannelCard key={ch.type} channel={ch} />
        ))}
      </div>
    </>
  );
}

function ChannelCard({ channel }: { channel: ChannelRunResult }) {
  const s = channel.stats;
  const totalOfType =
    channel.type === "walkin"
      ? useAppStore.getState().walkinPerHour
      : channel.type === "pickup"
        ? useAppStore.getState().pickupPerHour
        : useAppStore.getState().deliveryPerHour;
  const color = channel.type === "walkin" ? "#ff6b6b" : channel.type === "pickup" ? "#ffd93d" : "#6bcbff";
  const arrived = s.ordersServed + s.ordersUnfinished;

  return (
    <div className="rounded-md border border-[#ddd] bg-[#f8f6f3] px-2.5 py-1.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color }}>
        <span>●</span>
        <span className="capitalize">{channel.type}</span>
        {s.unstable && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] text-red-600">UNSTABLE</span>}
      </div>
      <div className="mt-1 grid grid-cols-4 gap-1">
        <MiniKpi label="Served" value={`${s.ordersServed}/${totalOfType}`} />
        <MiniKpi label="Arrived" value={String(arrived)} />
        <MiniKpi label="Wq" value={`${s.meanWq.toFixed(1)}m`} />
        <MiniKpi label="ρ" value={s.rho.toFixed(2)} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared components                                                   */
/* ------------------------------------------------------------------ */

function ServedByType({ stats }: { stats: SimStats }) {
  return (
    <div className="space-y-1 pt-1">
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
