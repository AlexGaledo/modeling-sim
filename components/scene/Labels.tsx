"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { COUNTER_X, EXIT_X, EXIT_Z, STATION_START_X } from "./QueueLane";

function makeTextTexture(text: string, color: string, fontSize: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const lines = text.split("\n");
  const lineHeight = fontSize * 1.3;
  canvas.width = 512;
  canvas.height = lines.length * lineHeight + 20;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  lines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, canvas.height / 2 + (i - (lines.length - 1) / 2) * lineHeight);
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function TextLabel({ x, z, text, color, fontSize = 0.45 }: { x: number; z: number; text: string; color: string; fontSize?: number }) {
  const texture = useMemo(() => makeTextTexture(text, color, 48), [text, color]);
  return (
    <mesh position={[x, 0.05, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[text.length * fontSize * 0.3 + 0.3, fontSize * 0.5]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

export default function FloorLabels({ c }: { c: number }) {
  const baristaZ = c > 0 ? (c - 1) * 1.4 / 2 : 0;
  console.log(`[LABELS] Rendering with c=${c}, baristaZ=${baristaZ}`);

  return (
    <>
      <TextLabel x={-3.5} z={0} text="——  QUEUE  ——" color="#999" />
      <TextLabel x={COUNTER_X} z={5.8} text="COUNTER" color="#8B4513" />
      <TextLabel x={STATION_START_X} z={Math.max(baristaZ + 2.8, 2.8)} text="——  BARISTA  ——" color="#00704A" />
      <TextLabel x={-0.5} z={6.2} text="PICKUP →" color="#3fa9f5" fontSize={0.35} />
      <TextLabel x={-5} z={-5.5} text="← ENTRANCE" color="#999" />

      {/* Legend for customer colors */}
      <TextLabel x={-7.2} z={-3} text="● Walk-in" color="#666" fontSize={0.3} />
      <TextLabel x={-7.2} z={-3.5} text="● Pickup" color="#666" fontSize={0.3} />
      <TextLabel x={-7.2} z={-4} text="● Delivery" color="#666" fontSize={0.3} />

      <mesh position={[-7.6, 0.03, -3]}>
        <circleGeometry args={[0.08, 16]} />
        <meshStandardMaterial color="#ff6b6b" />
      </mesh>
      <mesh position={[-7.6, 0.03, -3.5]}>
        <circleGeometry args={[0.08, 16]} />
        <meshStandardMaterial color="#ffd93d" />
      </mesh>
      <mesh position={[-7.6, 0.03, -4]}>
        <circleGeometry args={[0.08, 16]} />
        <meshStandardMaterial color="#6bcbff" />
      </mesh>
    </>
  );
}
