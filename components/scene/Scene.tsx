"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useSim } from "@/lib/hooks/useSim";
import { useAppStore } from "@/lib/store";
import Ground from "./Ground";
import Customers from "./Customer";
import BaristaStations from "./BaristaStation";
import QueueLane from "./QueueLane";
import FloorLabels from "./Labels";

export default function Scene() {
  const result = useSim();
  const baristas = useAppStore((s) => s.baristas);
  const horizon = useAppStore((s) => s.horizonMinutes);

  return (
    <div className="h-full w-full">
      <Canvas
        camera={{ position: [10, 12, 16], fov: 45, far: 100, near: 0.1 }}
      >
        <color attach="background" args={["#e8e0d6"]} />

        <hemisphereLight args={["#fff8f0", "#8ab4a0", 1.0]} />
        <directionalLight position={[12, 20, 10]} intensity={1.5} />
        <directionalLight position={[-8, 12, -6]} intensity={0.6} />
        <ambientLight intensity={0.4} />

        <Ground />
        <QueueLane />
        <BaristaStations c={baristas} />
        <FloorLabels c={baristas} />
        {result && (
          <Customers
            customers={result.customers}
            c={baristas}
            horizonMinutes={horizon}
          />
        )}
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
