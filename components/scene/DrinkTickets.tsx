"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Customer } from "@/lib/sim/types";
import type { Mode } from "@/lib/store";

const TICKET_COLORS: Record<string, THREE.Color> = {
  walkin: new THREE.Color("#ff6b6b"),
  pickup: new THREE.Color("#ffd93d"),
  delivery: new THREE.Color("#6bcbff"),
};

interface Props {
  customers: readonly Customer[];
  mode: Mode;
  clockRef: React.MutableRefObject<number>;
}

const MAX_TICKETS = 100;
const RAIL_X = 5;
const RAIL_BASE_Y = 0.68;

/** Stack a group of tickets vertically with slight alternating rotation. */
function placeStack(
  mesh: THREE.InstancedMesh,
  dummy: THREE.Object3D,
  colors: Float32Array,
  tickets: Customer[],
  baseZ: number,
  startSlot: number,
): number {
  let slot = startSlot;
  for (let j = 0; j < tickets.length && slot < MAX_TICKETS; j++) {
    const y = RAIL_BASE_Y + j * 0.018;
    const z = baseZ + (j % 3) * 0.006;
    const tilt = (j % 2 === 0 ? 1 : -1) * 0.04;

    dummy.position.set(RAIL_X, y, z);
    dummy.rotation.set(0, 0, tilt);
    dummy.updateMatrix();
    mesh.setMatrixAt(slot, dummy.matrix);

    const cust = tickets[j]!;
    const color = TICKET_COLORS[cust.orderType]!;
    colors[slot * 3] = color.r;
    colors[slot * 3 + 1] = color.g;
    colors[slot * 3 + 2] = color.b;
    slot++;
  }
  return slot;
}

export default function DrinkTickets({ customers, mode, clockRef }: Props) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => {
    const d = new THREE.Object3D();
    d.scale.set(1.4, 1.4, 1);
    return d;
  }, []);
  const colors = useMemo(() => new Float32Array(MAX_TICKETS * 3), []);

  useFrame(() => {
    const now = clockRef.current;
    const mesh = ref.current;
    if (!mesh) return;

    // Orders in the drink queue: service started but not yet departed
    const inService = customers.filter(
      (c) =>
        c.serviceStartTime !== undefined &&
        c.serviceStartTime <= now &&
        (c.departureTime === undefined || c.departureTime > now),
    );

    let slot = 0;

    if (mode === "multi") {
      // Each channel gets its own stack
      const zones: { type: Customer["orderType"]; z: number }[] = [
        { type: "walkin", z: 3 },
        { type: "pickup", z: 0.5 },
        { type: "delivery", z: -2 },
      ];

      for (const zone of zones) {
        const typed = inService
          .filter((c) => c.orderType === zone.type)
          .sort((a, b) => (a.serviceStartTime ?? 0) - (b.serviceStartTime ?? 0));
        slot = placeStack(mesh, dummy, colors, typed, zone.z, slot);
      }
    } else {
      // Single mode: one stack, sorted FIFO
      const sorted = [...inService].sort(
        (a, b) => (a.serviceStartTime ?? 0) - (b.serviceStartTime ?? 0),
      );
      slot = placeStack(mesh, dummy, colors, sorted, 2.5, 0);
    }

    // Hide remaining slots
    dummy.rotation.set(0, 0, 0);
    for (let i = slot; i < MAX_TICKETS; i++) {
      dummy.position.set(RAIL_X, -10, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, MAX_TICKETS]}>
      <planeGeometry args={[0.15, 0.1]} />
      <meshStandardMaterial
        vertexColors
        roughness={0.25}
        metalness={0.3}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}
