"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    console.log(`[SCENE] Mounted, baristas=${baristas}, horizon=${horizon}, hasResult=${!!result}`);
  }, [baristas, horizon, result]);

  return (
    <div className="h-full w-full">
      <Canvas
        camera={{ position: [10, 12, 16], fov: 40 }}
        shadows
        gl={{ antialias: true }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#e8e0d6"]} />

        <hemisphereLight args={["#fff8f0", "#8ab4a0", 0.7]} />
        <directionalLight
          position={[12, 20, 10]}
          intensity={1.4}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={40}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
        />
        <directionalLight position={[-8, 12, -6]} intensity={0.4} />
        <pointLight position={[2, 5, 0]} intensity={0.5} color="#ffd700" />

        {/* DIAGNOSTIC: red cube at origin — do you see this? */}
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color="#ff0000" />
        </mesh>

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
          target={[2, 0, 0]}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={6}
          maxDistance={40}
          enablePan={false}
        />
      </Canvas>
    </div>
  );
}
