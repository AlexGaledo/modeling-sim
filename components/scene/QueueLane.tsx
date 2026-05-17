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

export function deliveryQueueSlotPosition(slotIndex: number): [number, number, number] {
  return [DELIVERY_LANE_X - slotIndex * LANE_SPACING, 0, DELIVERY_LANE_Z];
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

      {/* Queue lane — left side, horizontal along x */}
      <mesh position={[-3.5, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7, 1.5]} />
        <meshStandardMaterial color="#e8dcc8" />
      </mesh>
      <mesh position={[-3.5, 0.02, 0.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7, 0.03]} />
        <meshStandardMaterial color="#c4b49a" />
      </mesh>
      <mesh position={[-3.5, 0.02, -0.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7, 0.03]} />
        <meshStandardMaterial color="#c4b49a" />
      </mesh>

      {/* Delivery queue lane — back left, separate from walk-in queue */}
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

      {/* Service area floor — right side, behind counter */}
      <mesh position={[2.5, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.5, 13]} />
        <meshStandardMaterial color="#e0d5c5" />
      </mesh>

      {/* Entrance tile — back wall gap */}
      <mesh position={[-5, 0.015, -6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2, 2]} />
        <meshStandardMaterial color="#d4c9b8" />
      </mesh>

      {/* Pickup area floor — near exit */}
      <mesh position={[-1, 0.015, 5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 2.5]} />
        <meshStandardMaterial color="#d4c9b8" />
      </mesh>

      {/* ── WALLS ── */}

      {/* Back wall (z = -7) — entrance gap at x=-5 */}
      <Wall position={[-7, 1.5, -7]} size={[2, 3, 0.2]} color="#c4b49a" />
      <Wall position={[2, 1.5, -7]} size={[12, 3, 0.2]} color="#c4b49a" />

      {/* Left wall (x = -8) */}
      <Wall position={[-8, 1.5, 0]} size={[0.2, 3, ROOM_DEPTH]} color="#c4b49a" />

      {/* Right wall (x = 8) */}
      <Wall position={[8, 1.5, 0]} size={[0.2, 3, ROOM_DEPTH]} color="#c4b49a" />

      {/* Front wall (z = 7) — exit gap at x=-2 */}
      <Wall position={[-5.5, 1.5, 7]} size={[5, 3, 0.2]} color="#c4b49a" />
      <Wall position={[3.5, 1.5, 7]} size={[9, 3, 0.2]} color="#c4b49a" />

      {/* ── COUNTER — vertical divider between queue and baristas ── */}
      <group position={[COUNTER_X, 0, 0]}>
        <mesh position={[0, 0.95, 0]}>
          <boxGeometry args={[0.45, 0.1, 10]} />
          <meshStandardMaterial color="#c49a6c" roughness={0.3} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.35, 0.85, 9.8]} />
          <meshStandardMaterial color="#a0784c" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.45, 5.05]}>
          <boxGeometry args={[0.36, 0.85, 0.05]} />
          <meshStandardMaterial color="#6b8f71" roughness={0.5} />
        </mesh>
      </group>

      {/* ── DELIVERY WINDOW — back end of counter ── */}
      <group position={[DELIVERY_WINDOW_X, 0, DELIVERY_WINDOW_Z]}>
        {/* Counter base — perpendicular stub extending into service area */}
        <mesh position={[0.5, 0.45, 0]}>
          <boxGeometry args={[1.0, 0.85, 0.6]} />
          <meshStandardMaterial color="#a0784c" roughness={0.6} />
        </mesh>
        {/* Countertop */}
        <mesh position={[0.5, 0.95, 0]}>
          <boxGeometry args={[1.1, 0.1, 0.7]} />
          <meshStandardMaterial color="#c49a6c" roughness={0.3} metalness={0.1} />
        </mesh>
        {/* Window opening / pass-through */}
        <mesh position={[0, 0.5, 0.35]}>
          <planeGeometry args={[0.45, 0.65]} />
          <meshStandardMaterial color="#6bcbff" emissive="#6bcbff" emissiveIntensity={0.3} opacity={0.4} transparent />
        </mesh>
        {/* Window frame */}
        <mesh position={[0, 0.5, 0.36]}>
          <planeGeometry args={[0.5, 0.7]} />
          <meshStandardMaterial color="#888" roughness={0.5} metalness={0.3} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* ── PICKUP SHELF — between counter and exit ── */}
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
        <meshStandardMaterial color="#3fa9f5" emissive="#3fa9f5" emissiveIntensity={0.5} />
      </mesh>

      {/* ── DECORATIVE TRIM (left wall baseboard) ── */}
      <mesh position={[-8, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.15, ROOM_DEPTH]} />
        <meshStandardMaterial color="#b8a68e" />
      </mesh>
    </>
  );
}
