"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useSim } from "@/lib/hooks/useSim";
import { useSimClock } from "@/lib/hooks/useSimClock";
import { useAppStore } from "@/lib/store";
import Ground from "./Ground";
import Customers from "./Customer";
import DrinkTickets from "./DrinkTickets";
import BaristaStations from "./BaristaStation";
import QueueLane from "./QueueLane";
import FloorLabels from "./Labels";

export default function Scene() {
  const result = useSim();
  const mode = useAppStore((s) => s.mode);
  const baristas = useAppStore((s) => s.baristas);
  const horizon = useAppStore((s) => s.horizonMinutes);
  const baristasPerChannel = useAppStore((s) => s.baristasPerChannel);

  const c = mode === "single" ? baristas : baristasPerChannel;

  return (
    <div className="h-full w-full">
      <Canvas
        camera={{ position: [10, 12, 16], fov: 45, far: 100, near: 0.1 }}
      >
        <color attach="background" args={["#e8e0d6"]} />

        <hemisphereLight args={["#fff0e0", "#8ab4a0", 1.2]} />
        <directionalLight position={[12, 20, 10]} intensity={1.8} castShadow={false} />
        <directionalLight position={[-8, 12, -6]} intensity={0.7} />
        <ambientLight intensity={0.3} />
        {/* Warm accent on counter area */}
        <pointLight position={[2, 4, 2]} intensity={0.8} color="#ffdd88" distance={12} />

        <SceneContent
          result={result}
          mode={mode}
          c={c}
          horizon={horizon}
        />

        <OrbitControls
          makeDefault
          target={[0, 0, 0]}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={4}
          maxDistance={50}
          enablePan={true}
        />
      </Canvas>
    </div>
  );
}

/** Children inside Canvas so hooks like useFrame / useSimClock work. */
function SceneContent({
  result,
  mode,
  c,
  horizon,
}: {
  result: ReturnType<typeof useSim>;
  mode: string;
  c: number;
  horizon: number;
}) {
  const { ref: clockRef, advance } = useSimClock(horizon);
  const runId = useAppStore((s) => s.runId);

  return (
    <>
      <Ground />
      <QueueLane />
      <BaristaStations c={c} />
      <FloorLabels c={c} mode={mode as "single" | "multi" | "compare"} />
      {runId > 0 && (
        <Customers
          customers={result.customers}
          c={c}
          clockRef={clockRef}
          advance={advance}
        />
      )}
      {runId > 0 && (
        <DrinkTickets
          customers={result.customers}
          mode={mode as "single" | "multi" | "compare"}
          clockRef={clockRef}
        />
      )}
    </>
  );
}
