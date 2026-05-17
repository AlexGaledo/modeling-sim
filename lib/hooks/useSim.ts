"use client";

import { useEffect, useMemo } from "react";
import { runSimulation, type RunResult } from "@/lib/sim/engine";
import { selectSimParams, useAppStore } from "@/lib/store";

export function useSim(): RunResult | null {
  const runId = useAppStore((s) => s.runId);
  const playState = useAppStore((s) => s.playState);
  const params = useAppStore(selectSimParams);

  const result = useMemo(() => {
    if (runId === 0) return null;
    console.log(`[SIM] Starting simulation runId=${runId}`, {
      lambda: params.lambda,
      mu: params.mu,
      c: params.c,
      horizonMinutes: params.horizonMinutes,
      warmupMinutes: params.warmupMinutes,
      seed: params.seed,
    });
    const r = runSimulation(params);
    console.log(`[SIM] Simulation complete: ${r.customers.length} customers, stats=`, r.stats);
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  useEffect(() => {
    if (result && playState === "running") {
      console.log("[SIM] Setting playState -> done");
      useAppStore.setState({ playState: "done" });
    }
  }, [result, playState]);

  return result;
}
