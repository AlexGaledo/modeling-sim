"use client";

import { useState } from "react";
import SceneClient from "@/components/SceneClient";
import ControlPanel from "@/components/controls/ControlPanel";
import MetricsPanel from "@/components/panels/MetricsPanel";
import { useAppStore } from "@/lib/store";

export default function AppShell() {
  const [open, setOpen] = useState(false);
  const playState = useAppStore((s) => s.playState);
  const runId = useAppStore((s) => s.runId);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#e8e0d6] text-[#333]">
      <div className="absolute inset-0">
        <SceneClient />
      </div>

      {/* Top bar overlay */}
      <div className="absolute left-0 top-0 z-20 flex items-center gap-3 p-3">
        <button
          onClick={() => setOpen(!open)}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/80 text-lg text-[#555] shadow-sm backdrop-blur-sm hover:bg-white"
          title="Toggle controls"
        >
          {open ? "✕" : "☰"}
        </button>
        <span className="rounded-lg bg-white/80 px-3 py-1.5 text-sm font-semibold text-[#555] shadow-sm backdrop-blur-sm">
          Starbucks Queue Sim
        </span>
      </div>

      {/* Slide-out drawer */}
      <div
        className={`absolute left-0 top-0 z-10 flex h-full flex-col bg-white/95 text-[#444] shadow-lg backdrop-blur-md transition-all duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        } w-[340px] border-r border-[#ddd]`}
      >
        <div className="flex-1 overflow-y-auto p-4 pt-16">
          <ControlPanel />
        </div>
        <div className="border-t border-[#ddd] p-4">
          <MetricsPanel />
        </div>
      </div>

      {open && (
        <div
          className="absolute inset-0 z-[5] cursor-pointer"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
