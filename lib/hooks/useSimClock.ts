"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";

export function useSimClock(horizonMinutes: number) {
  const ref = useRef(0);
  const simSpeed = useAppStore((s) => s.simSpeed);
  const runId = useAppStore((s) => s.runId);

  useEffect(() => {
    ref.current = 0;
  }, [runId]);

  return {
    ref,
    advance: (deltaSec: number) => {
      if (runId === 0) return;
      const next = ref.current + deltaSec * simSpeed;
      ref.current = Math.min(next, horizonMinutes);
    },
  };
}
