"use client";

import { useSim, type ChannelRunResult, type MultiRunResult } from "@/lib/hooks/useSim";
import { economicsFromStats } from "@/lib/sim/economics";
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
      ) : result.mode === "multi" ? (
        <MultiResultView result={result} />
      ) : (
        <SingleResultView stats={result.stats} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Banner                                                              */
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
/*  Economics block — shared by single + multi                          */
/* ------------------------------------------------------------------ */

function EconomicsBlock({ stats }: { stats: SimStats }) {
  const hourlyWage = useAppStore((s) => s.hourlyWage);
  const profitPerDrink = useAppStore((s) => s.profitPerDrink);
  const econ = economicsFromStats(stats, { hourlyWage, profitPerDrink });
  const profitPositive = econ.profitPerHour >= 0;

  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-wide text-[#999]">Economics (per hour)</div>
      <div className="grid grid-cols-2 gap-2">
        <Kpi label="Revenue" value={`$${econ.revenuePerHour.toFixed(2)}`} />
        <Kpi label="Labor" value={`$${econ.laborCostPerHour.toFixed(2)}`} />
        <Kpi
          label="Profit"
          value={`${profitPositive ? "" : "−"}$${Math.abs(econ.profitPerHour).toFixed(2)}`}
          highlight={profitPositive}
        />
        <Kpi label="Break-even drinks" value={String(econ.breakEvenDrinks)} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single                                                              */
/* ------------------------------------------------------------------ */

function SingleResultView({ stats }: { stats: SimStats }) {
  const total = useAppStore((s) => s.walkinPerHour + s.pickupPerHour + s.deliveryPerHour);

  return (
    <>
      <ThroughputBanner served={stats.drinksServed} total={total} label="SINGLE QUEUE" />

      <div className="grid grid-cols-2 gap-2">
        <Kpi label="Total customers" value={String(total) + " /hr"} highlight />
        <Kpi label="Drinks served" value={String(stats.drinksServed)} />
        <Kpi label="Unserved" value={String(stats.customersUnserved)} />
        <Kpi label="Drinks / barista" value={String(stats.drinksPerBarista)} />
      </div>

      <ServedByType stats={stats} />
      <EconomicsBlock stats={stats} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Multi                                                               */
/* ------------------------------------------------------------------ */

function MultiResultView({ result }: { result: MultiRunResult }) {
  const total = useAppStore((s) => s.walkinPerHour + s.pickupPerHour + s.deliveryPerHour);
  const totalIdle = result.channels.reduce((sum, ch) => sum + ch.stats.idleBaristaMinutes, 0);

  return (
    <>
      <ThroughputBanner served={result.stats.drinksServed} total={total} label="PER-TYPE QUEUES" />

      <Kpi label="Total customers" value={String(total) + " /hr"} highlight />

      <div className="grid grid-cols-2 gap-2">
        <Kpi label="Drinks served" value={String(result.stats.drinksServed)} />
        <Kpi label="Unserved" value={String(result.stats.customersUnserved)} />
        <Kpi label="Drinks / barista" value={String(result.stats.drinksPerBarista)} />
        <Kpi label="Idle barista-min" value={String(totalIdle)} />
      </div>

      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-wide text-[#999]">Per channel</div>
        {result.channels.map((ch) => (
          <ChannelCard key={ch.type} channel={ch} />
        ))}
      </div>

      <EconomicsBlock stats={result.stats} />
    </>
  );
}

function ChannelCard({ channel }: { channel: ChannelRunResult }) {
  const s = channel.stats;
  const color = channel.type === "walkin" ? "#ff6b6b" : channel.type === "pickup" ? "#ffd93d" : "#6bcbff";
  return (
    <div className="rounded-md border border-[#ddd] bg-[#f8f6f3] px-2.5 py-1.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color }}>
        <span>●</span>
        <span className="capitalize">{channel.type}</span>
      </div>
      <div className="mt-1 grid grid-cols-3 gap-1">
        <MiniKpi label="Served" value={`${s.drinksServed}/${s.customersTotal}`} />
        <MiniKpi label="Unserved" value={String(s.customersUnserved)} />
        <MiniKpi label="Idle min" value={String(s.idleBaristaMinutes)} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bits                                                                */
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
