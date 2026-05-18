"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { COUNTER_X, DELIVERY_WINDOW_X, DELIVERY_WINDOW_Z } from "./QueueLane";
import type { Mode } from "@/lib/store";

function makeTextTexture(text: string, color: string, fontSize: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const lines = text.split("\n");
  const lineHeight = fontSize * 1.3;
  canvas.width = 512;
  canvas.height = lines.length * lineHeight + 24;
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

function TextLabel({
  x, z, text, color, fontSize = 0.45, bgColor,
}: {
  x: number; z: number; text: string; color: string; fontSize?: number; bgColor?: string;
}) {
  const texture = useMemo(() => makeTextTexture(text, color, 48), [text, color]);
  const w = text.length * fontSize * 0.3 + 0.3;
  const h = fontSize * 0.5;
  return (
    <group position={[x, 0.05, z]}>
      {/* Background panel */}
      {bgColor && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w + 0.08, h + 0.06]} />
          <meshBasicMaterial color={bgColor} transparent opacity={0.75} depthWrite={false} />
        </mesh>
      )}
      {/* Text */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function FloorLabels({ c, mode }: { c: number; mode: Mode }) {
  return (
    <>
      <TextLabel x={-3.5} z={0} text="CUSTOMER QUEUE" color="#666" fontSize={0.4} bgColor="#f5efe6" />
      <TextLabel x={COUNTER_X + 0.3} z={5.8} text="COUNTER" color="#8B4513" fontSize={0.4} bgColor="#f0e8dc" />
      <TextLabel x={3} z={3.2} text="BARISTA" color="#00704A" fontSize={0.4} bgColor="#e8f5e9" />

      {/* Delivery window */}
      <TextLabel x={DELIVERY_WINDOW_X} z={DELIVERY_WINDOW_Z - 1.0} text="DELIVERY" color="#6bcbff" fontSize={0.4} bgColor="#e8f0ff" />
      <TextLabel x={DELIVERY_WINDOW_X + 0.5} z={DELIVERY_WINDOW_Z + 0.7} text="WINDOW" color="#6bcbff" fontSize={0.3} />

      {/* Drink queue labels */}
      {mode === "single" ? (
        <>
          <TextLabel x={6.3} z={0.5} text="ORDERS" color="#8B4513" fontSize={0.4} bgColor="#f0e8dc" />
          <TextLabel x={6.3} z={-0.2} text="(FCFS)" color="#999" fontSize={0.25} />
        </>
      ) : mode === "multi" ? (
        <>
          <TextLabel x={6.3} z={3.3} text="WALK-IN" color="#ff6b6b" fontSize={0.35} bgColor="#fff0f0" />
          <TextLabel x={6.3} z={0.8} text="PICKUP" color="#ffd93d" fontSize={0.35} bgColor="#fffde8" />
          <TextLabel x={6.3} z={-1.7} text="DELIVERY" color="#6bcbff" fontSize={0.35} bgColor="#e8f4ff" />
        </>
      ) : null}

      <TextLabel x={-0.5} z={6.5} text="PICKUP" color="#3fa9f5" fontSize={0.35} bgColor="#e8f4ff" />
      <TextLabel x={-5} z={-5.5} text="ENTRANCE" color="#888" fontSize={0.35} bgColor="#f5efe6" />

      {/* Legend */}
      <mesh position={[-7.6, 0.03, -3]}>
        <circleGeometry args={[0.1, 16]} />
        <meshStandardMaterial color="#ff6b6b" />
      </mesh>
      <TextLabel x={-7.15} z={-3} text="Walk-in" color="#666" fontSize={0.3} />
      <mesh position={[-7.6, 0.03, -3.6]}>
        <circleGeometry args={[0.1, 16]} />
        <meshStandardMaterial color="#ffd93d" />
      </mesh>
      <TextLabel x={-7.15} z={-3.6} text="Pickup" color="#666" fontSize={0.3} />
      <mesh position={[-7.6, 0.03, -4.2]}>
        <circleGeometry args={[0.1, 16]} />
        <meshStandardMaterial color="#6bcbff" />
      </mesh>
      <TextLabel x={-7.15} z={-4.2} text="Delivery" color="#666" fontSize={0.3} />
    </>
  );
}
