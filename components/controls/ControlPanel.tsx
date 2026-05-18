"use client";

import { useAppStore } from "@/lib/store";
import Slider from "./Slider";

export default function ControlPanel() {
  const s = useAppStore();
  const total = s.walkinPerHour + s.pickupPerHour + s.deliveryPerHour;

  return (
    <div className="space-y-5 text-sm">
      <section>
        <h2 className="mb-2 text-base font-semibold text-[#555]">Mode</h2>
        <div className="flex gap-1 rounded-lg bg-[#f0ebe3] p-1">
          {(["single", "multi", "compare"] as const).map((m) => (
            <button
              key={m}
              onClick={() => s.setMode(m)}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                s.mode === m
                  ? "bg-[#00704A] text-white shadow-sm"
                  : "text-[#666] hover:bg-white/60"
              }`}
            >
              {m === "single" ? "Single queue" : m === "multi" ? "Per-type queues" : "Compare"}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#555]">Customers (arriving in 1 hour)</h2>
        <div className="flex items-center gap-2 rounded-md border border-[#ddd] bg-[#f8f6f3] px-2.5 py-1.5">
          <span className="text-[10px] uppercase tracking-wide text-[#999]">Total</span>
          <span className="font-mono text-sm text-[#333]">{total}</span>
        </div>
        <Slider label="Walk-in" value={s.walkinPerHour} min={0} max={200} step={5} onChange={s.setWalkinPerHour} />
        <Slider label="Pickup" value={s.pickupPerHour} min={0} max={200} step={5} onChange={s.setPickupPerHour} />
        <Slider label="Delivery" value={s.deliveryPerHour} min={0} max={200} step={5} onChange={s.setDeliveryPerHour} />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#555]">Service</h2>

        {s.mode === "single" && (
          <Slider label="Baristas (c)" value={s.baristas} min={1} max={20} onChange={s.setBaristas} />
        )}

        {s.mode === "multi" && (
          <Slider label="Baristas per channel" value={s.baristasPerChannel} min={1} max={10} onChange={s.setBaristasPerChannel} />
        )}

        {s.mode === "compare" && (
          <>
            <Slider label="Single-queue baristas (c)" value={s.baristas} min={1} max={20} onChange={s.setBaristas} />
            <Slider label="Multi: baristas / channel" value={s.baristasPerChannel} min={1} max={10} onChange={s.setBaristasPerChannel} />
          </>
        )}

        <Slider
          label="Service time / drink (min)"
          value={s.serviceTimeMinutes}
          min={5}
          max={10}
          step={1}
          onChange={s.setServiceTimeMinutes}
        />
        <Slider
          label="Sim speed"
          value={s.simSpeed}
          min={1}
          max={100}
          format={(v) => `${v}×`}
          onChange={s.setSimSpeed}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#555]">Economics</h2>
        <Slider
          label="Barista wage ($/hr)"
          value={s.hourlyWage}
          min={10}
          max={20}
          step={1}
          format={(v) => `$${v}`}
          onChange={s.setHourlyWage}
        />
        <Slider
          label="Profit / drink"
          value={s.profitPerDrink}
          min={1}
          max={5}
          step={0.25}
          format={(v) => `$${v.toFixed(2)}`}
          onChange={s.setProfitPerDrink}
        />
      </section>

      <section>
        <div className="flex gap-2">
          <button
            onClick={s.play}
            disabled={s.playState === "running"}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold shadow-sm transition-colors ${
              s.playState === "running"
                ? "bg-[#999] text-white cursor-not-allowed"
                : "bg-[#00704A] text-white hover:bg-[#005a3a]"
            }`}
          >
            {s.playState === "running" ? "Running..." : s.playState === "done" ? "Re-run" : "Play"}
          </button>
          <button
            onClick={s.reset}
            className="rounded-lg bg-[#f0ebe3] px-4 py-2.5 text-sm font-medium text-[#666] transition-colors hover:bg-[#e5ddd3]"
          >
            Reset
          </button>
        </div>
      </section>
    </div>
  );
}
