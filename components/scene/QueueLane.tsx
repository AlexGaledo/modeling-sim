"use client";

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

export function queueSlotPosition(slotIndex: number): [number, number, number] {
  return [LANE_X_HEAD - slotIndex * LANE_SPACING, 0, LANE_Z];
}

export function stationPosition(stationId: number, totalStations: number): [number, number, number] {
  const zOffset = (stationId - (totalStations - 1) / 2) * STATION_SPACING_Z;
  return [STATION_START_X, 0, zOffset];
}

function Wall({ position, size, color }: { position: [number, number, number]; size: [number, number, number]; color: string }) {
  return (
    <mesh position={position} receiveShadow>
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
      <mesh position={[-3.5, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
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

      {/* Service area floor — right side, behind counter */}
      <mesh position={[2.5, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4.5, 13]} />
        <meshStandardMaterial color="#e0d5c5" />
      </mesh>

      {/* Entrance tile — back wall gap */}
      <mesh position={[-5, 0.015, -6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2, 2]} />
        <meshStandardMaterial color="#d4c9b8" />
      </mesh>

      {/* Pickup area floor — near exit */}
      <mesh position={[-1, 0.015, 5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
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
        <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.45, 0.1, 10]} />
          <meshStandardMaterial color="#c49a6c" roughness={0.3} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.35, 0.85, 9.8]} />
          <meshStandardMaterial color="#a0784c" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.45, 5.05]} castShadow>
          <boxGeometry args={[0.36, 0.85, 0.05]} />
          <meshStandardMaterial color="#6b8f71" roughness={0.5} />
        </mesh>
      </group>

      {/* ── PICKUP SHELF — between counter and exit ── */}
      <mesh position={[-0.5, 0.7, 5]} castShadow receiveShadow>
        <boxGeometry args={[0.6, 0.06, 1.0]} />
        <meshStandardMaterial color="#8fbc8f" roughness={0.4} metalness={0.1} />
      </mesh>
      <mesh position={[-0.5, 0.35, 5]} castShadow>
        <boxGeometry args={[0.55, 0.6, 0.9]} />
        <meshStandardMaterial color="#6b8f71" roughness={0.6} />
      </mesh>

      {/* ── EXIT SIGN ── */}
      <mesh position={[EXIT_X, 2.0, EXIT_Z + 0.3]} rotation={[0, 0, 0]}>
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
