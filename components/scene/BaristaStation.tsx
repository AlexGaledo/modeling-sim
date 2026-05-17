"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { stationPosition } from "./QueueLane";

function makeTextTexture(text: string, color: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = 256;
  canvas.height = 64;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "bold 36px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function BaristaLabel({ text, color }: { text: string; color: string }) {
  const texture = useMemo(() => makeTextTexture(text, color), [text, color]);
  return (
    <mesh position={[0, 1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.0, 0.25]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

export default function BaristaStations({ c }: { c: number }) {
  console.log(`[BARISTA] Rendering ${c} stations`);
  return (
    <group>
      {Array.from({ length: c }).map((_, i) => {
        const [x, , z] = stationPosition(i, c);
        return (
          <group key={i} position={[x, 0, z]}>
            {/* Station platform */}
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[1.2, 1.2]} />
              <meshStandardMaterial color="#d4edda" />
            </mesh>

            {/* Machine body */}
            <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.7, 0.7, 0.7]} />
              <meshStandardMaterial color="#00704A" roughness={0.5} metalness={0.4} />
            </mesh>
            {/* Machine screen */}
            <mesh position={[0, 0.7, 0.35]}>
              <planeGeometry args={[0.35, 0.2]} />
              <meshStandardMaterial color="#88ddbb" emissive="#88ddbb" emissiveIntensity={0.5} />
            </mesh>
            {/* Machine top */}
            <mesh position={[0, 0.75, 0]}>
              <boxGeometry args={[0.55, 0.06, 0.55]} />
              <meshStandardMaterial color="#00c853" roughness={0.2} metalness={0.6} />
            </mesh>
            {/* Steam wand */}
            <mesh position={[0.25, 1.1, -0.1]}>
              <cylinderGeometry args={[0.025, 0.04, 0.4, 8]} />
              <meshStandardMaterial color="#c0c0c0" roughness={0.3} metalness={0.8} />
            </mesh>
            {/* Portafilter */}
            <mesh position={[-0.2, 0.6, 0.2]}>
              <cylinderGeometry args={[0.05, 0.07, 0.06, 12]} />
              <meshStandardMaterial color="#333" roughness={0.9} />
            </mesh>

            {/* Barista label above */}
            <BaristaLabel text={`Barista ${i + 1}`} color="#00704A" />
          </group>
        );
      })}
    </group>
  );
}
