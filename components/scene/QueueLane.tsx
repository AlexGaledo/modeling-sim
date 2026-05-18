"use client";

import * as THREE from "three";

export const LANE_X_HEAD = 0;
export const LANE_SPACING = 0.6;
export const LANE_Z = 0;
export const COUNTER_X = 1.2;
export const STATION_START_X = 3.0;
export const STATION_SPACING_Z = 1.4;
export const EXIT_X = -2;
export const EXIT_Z = 5.5;
export const ROOM_WIDTH = 16;
export const ROOM_DEPTH = 14;

/** Delivery window at back end of counter */
export const DELIVERY_WINDOW_X = 1.2;
export const DELIVERY_WINDOW_Z = -4.5;
export const DELIVERY_LANE_X = -3.5;
export const DELIVERY_LANE_Z = -4.5;

export function queueSlotPosition(slotIndex: number): [number, number, number] {
  return [LANE_X_HEAD - slotIndex * LANE_SPACING, 0, LANE_Z];
}

export const PICKUP_LANE_X = -0.5;
export const PICKUP_LANE_Z = 5;

export function deliveryQueueSlotPosition(slotIndex: number): [number, number, number] {
  return [DELIVERY_LANE_X - slotIndex * LANE_SPACING, 0, DELIVERY_LANE_Z];
}

export function pickupQueueSlotPosition(slotIndex: number): [number, number, number] {
  return [PICKUP_LANE_X - slotIndex * LANE_SPACING, 0, PICKUP_LANE_Z];
}

export function stationPosition(stationId: number, totalStations: number): [number, number, number] {
  const zOffset = (stationId - (totalStations - 1) / 2) * STATION_SPACING_Z;
  return [STATION_START_X, 0, zOffset];
}

function Wall({ position, size, color }: { position: [number, number, number]; size: [number, number, number]; color: string }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

export default function QueueLane() {
  return (
    <>
      {/* ── FLOOR ZONES ── */}

      {/* Queue lane — left side */}
      <mesh position={[-3.5, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7, 1.5]} />
        <meshStandardMaterial color="#e8dcc8" />
      </mesh>
      {/* Queue lane borders */}
      <mesh position={[-3.5, 0.02, 0.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7, 0.04]} />
        <meshStandardMaterial color="#c4b49a" />
      </mesh>
      <mesh position={[-3.5, 0.02, -0.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7, 0.04]} />
        <meshStandardMaterial color="#c4b49a" />
      </mesh>
      {/* Queue direction arrows */}
      <mesh position={[-2.5, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.25, 0.2]} />
        <meshStandardMaterial color="#c4b49a" transparent opacity={0.5} />
      </mesh>

      {/* Delivery queue lane — back left */}
      <mesh position={[-3.5, 0.015, -4.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7, 1.2]} />
        <meshStandardMaterial color="#e0e8f0" />
      </mesh>
      <mesh position={[-3.5, 0.02, -3.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7, 0.03]} />
        <meshStandardMaterial color="#6bcbff" opacity={0.3} transparent />
      </mesh>
      <mesh position={[-3.5, 0.02, -5.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7, 0.03]} />
        <meshStandardMaterial color="#6bcbff" opacity={0.3} transparent />
      </mesh>

      {/* Service area floor — behind counter */}
      <mesh position={[2.5, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.5, 13]} />
        <meshStandardMaterial color="#e0d5c5" />
      </mesh>

      {/* Entrance tile */}
      <mesh position={[-5, 0.015, -6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2, 2]} />
        <meshStandardMaterial color="#d4c9b8" />
      </mesh>

      {/* Pickup area floor */}
      <mesh position={[-1, 0.015, 5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 2.5]} />
        <meshStandardMaterial color="#d4c9b8" />
      </mesh>

      {/* ── WALLS ── */}
      <Wall position={[-7, 1.5, -7]} size={[2, 3, 0.2]} color="#c4b49a" />
      <Wall position={[2, 1.5, -7]} size={[12, 3, 0.2]} color="#c4b49a" />
      <Wall position={[-8, 1.5, 0]} size={[0.2, 3, ROOM_DEPTH]} color="#c4b49a" />
      <Wall position={[8, 1.5, 0]} size={[0.2, 3, ROOM_DEPTH]} color="#c4b49a" />
      <Wall position={[-5.5, 1.5, 7]} size={[5, 3, 0.2]} color="#c4b49a" />
      <Wall position={[3.5, 1.5, 7]} size={[9, 3, 0.2]} color="#c4b49a" />

      {/* ── COUNTER — with warm wood finish ── */}
      <group position={[COUNTER_X, 0, 0]}>
        {/* Countertop */}
        <mesh position={[0, 0.95, 0]}>
          <boxGeometry args={[0.5, 0.08, 10]} />
          <meshStandardMaterial color="#d4a76a" roughness={0.25} metalness={0.05} />
        </mesh>
        {/* Counter body */}
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.38, 0.82, 9.8]} />
          <meshStandardMaterial color="#a0784c" roughness={0.6} />
        </mesh>
        {/* Front panel trim */}
        <mesh position={[-0.19, 0.45, 0]}>
          <boxGeometry args={[0.02, 0.78, 9.7]} />
          <meshStandardMaterial color="#8B6914" roughness={0.5} metalness={0.3} />
        </mesh>
        {/* Order screen — customer facing */}
        <mesh position={[-0.25, 0.75, 0.5]}>
          <planeGeometry args={[0.3, 0.25]} />
          <meshStandardMaterial color="#444" emissive="#222" emissiveIntensity={0.1} roughness={0.1} metalness={0.5} />
        </mesh>
        {/* End panel (front wall side) */}
        <mesh position={[0, 0.45, 5.05]}>
          <boxGeometry args={[0.4, 0.82, 0.05]} />
          <meshStandardMaterial color="#6b8f71" roughness={0.5} />
        </mesh>
      </group>

      {/* ── DELIVERY WINDOW ── */}
      <group position={[DELIVERY_WINDOW_X, 0, DELIVERY_WINDOW_Z]}>
        {/* Base */}
        <mesh position={[0.5, 0.45, 0]}>
          <boxGeometry args={[1.0, 0.82, 0.6]} />
          <meshStandardMaterial color="#a0784c" roughness={0.6} />
        </mesh>
        {/* Countertop */}
        <mesh position={[0.5, 0.95, 0]}>
          <boxGeometry args={[1.1, 0.08, 0.7]} />
          <meshStandardMaterial color="#d4a76a" roughness={0.25} metalness={0.05} />
        </mesh>
        {/* Pass-through opening */}
        <mesh position={[0, 0.5, 0.35]}>
          <planeGeometry args={[0.45, 0.65]} />
          <meshStandardMaterial color="#6bcbff" emissive="#6bcbff" emissiveIntensity={0.4} opacity={0.35} transparent />
        </mesh>
        {/* Window frame */}
        <mesh position={[0, 0.5, 0.36]}>
          <planeGeometry args={[0.52, 0.72]} />
          <meshStandardMaterial color="#888" roughness={0.5} metalness={0.3} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* ── DRINK QUEUE AREA — behind barista stations ── */}
      {/* Floor zone */}
      <mesh position={[5, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.5, 9]} />
        <meshStandardMaterial color="#e0dcc5" />
      </mesh>
      {/* Floor zone border */}
      <mesh position={[3.75, 0.016, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.04, 9]} />
        <meshStandardMaterial color="#c4b49a" />
      </mesh>
      {/* Ticket rail */}
      <group position={[5, 0, 0]}>
        <mesh position={[0, 0.65, 0]}>
          <boxGeometry args={[0.1, 0.03, 8.5]} />
          <meshStandardMaterial color="#777" roughness={0.3} metalness={0.4} />
        </mesh>
        {/* Rail support legs */}
        <mesh position={[0, 0.33, -4.2]}>
          <boxGeometry args={[0.06, 0.6, 0.06]} />
          <meshStandardMaterial color="#666" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.33, 4.2]}>
          <boxGeometry args={[0.06, 0.6, 0.06]} />
          <meshStandardMaterial color="#666" roughness={0.5} metalness={0.3} />
        </mesh>
      </group>

      {/* ── PICKUP SHELF ── */}
      <mesh position={[-0.5, 0.7, 5]}>
        <boxGeometry args={[0.6, 0.06, 1.0]} />
        <meshStandardMaterial color="#8fbc8f" roughness={0.4} metalness={0.1} />
      </mesh>
      <mesh position={[-0.5, 0.35, 5]}>
        <boxGeometry args={[0.55, 0.6, 0.9]} />
        <meshStandardMaterial color="#6b8f71" roughness={0.6} />
      </mesh>

      {/* ── EXIT SIGN ── */}
      <mesh position={[EXIT_X, 2.0, EXIT_Z + 0.3]}>
        <planeGeometry args={[0.6, 0.3]} />
        <meshStandardMaterial color="#3fa9f5" emissive="#3fa9f5" emissiveIntensity={0.6} />
      </mesh>
      {/* Exit sign glow */}
      <mesh position={[EXIT_X, 2.0, EXIT_Z + 0.15]}>
        <planeGeometry args={[0.4, 0.15]} />
        <meshStandardMaterial color="#3fa9f5" emissive="#3fa9f5" emissiveIntensity={0.2} transparent opacity={0.4} />
      </mesh>

      {/* ── BASEBOARD ── */}
      <mesh position={[-8, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.15, ROOM_DEPTH]} />
        <meshStandardMaterial color="#b8a68e" />
      </mesh>
    </>
  );
}
